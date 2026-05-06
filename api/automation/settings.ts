import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { ensureAutomationTables } from "../_lib/automation.js";
import { sql } from "../_lib/db.js";

const schema = z.object({
  enabled: z.boolean(),
  autoPublish: z.boolean(),
  postsPerDay: z.number().int().min(1).max(20),
  seedPrompt: z.string().max(600).optional(),
});

type SettingsRow = {
  enabled: boolean;
  auto_publish: boolean;
  posts_per_day: number;
  seed_prompt: string;
  last_run_at: string | null;
  last_error: string | null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") return methodNotAllowed(res, ["GET", "POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    await ensureAutomationTables();

    if (req.method === "GET") {
      const result = await sql<SettingsRow>(
        `select enabled, auto_publish, posts_per_day, seed_prompt, last_run_at::text, last_error
         from automation_settings where workspace_id = $1 limit 1`,
        [session.workspaceId]
      );
      const row = result.rows[0];
      if (!row) {
        return sendJson(res, 200, {
          enabled: false,
          autoPublish: false,
          postsPerDay: 3,
          seedPrompt: "",
          lastRunAt: null,
          lastError: null,
        });
      }

      return sendJson(res, 200, {
        enabled: row.enabled,
        autoPublish: row.auto_publish,
        postsPerDay: row.posts_per_day,
        seedPrompt: row.seed_prompt ?? "",
        lastRunAt: row.last_run_at,
        lastError: row.last_error,
      });
    }

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid automation settings payload");

    await sql(
      `insert into automation_settings (workspace_id, user_id, enabled, auto_publish, posts_per_day, seed_prompt, updated_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (workspace_id)
       do update set
         user_id = excluded.user_id,
         enabled = excluded.enabled,
         auto_publish = excluded.auto_publish,
         posts_per_day = excluded.posts_per_day,
         seed_prompt = excluded.seed_prompt,
         updated_at = now()`,
      [
        session.workspaceId,
        session.userId,
        parsed.data.enabled,
        parsed.data.autoPublish,
        parsed.data.postsPerDay,
        parsed.data.seedPrompt ?? "",
      ]
    );

    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
