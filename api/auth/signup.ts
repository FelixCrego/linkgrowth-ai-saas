import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { createSessionToken, setSessionCookie } from "../_lib/session.js";
import { withTransaction } from "../_lib/db.js";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(120),
  workspaceName: z.string().min(2).max(120).optional(),
});

function toSlug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid signup payload");

    const { email, password, name, workspaceName } = parsed.data;
    const emailNormalized = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const created = await withTransaction(async (client) => {
      const existing = await client.query<{ id: string }>("select id from users where email = $1 limit 1", [emailNormalized]);
      if (existing.rowCount) {
        throw new Error("Email already registered");
      }

      const userId = crypto.randomUUID();
      const workspaceId = crypto.randomUUID();
      const slugBase = toSlug(workspaceName ?? `${name.split(" ")[0]} workspace`);
      const slug = `${slugBase}-${Math.random().toString(36).slice(2, 8)}`;
      const workspaceFinalName = workspaceName ?? `${name.split(" ")[0]}'s Workspace`;

      await client.query(
        "insert into users (id, email, full_name, password_hash) values ($1, $2, $3, $4)",
        [userId, emailNormalized, name, passwordHash]
      );

      await client.query(
        "insert into workspaces (id, owner_user_id, name, slug) values ($1, $2, $3, $4)",
        [workspaceId, userId, workspaceFinalName, slug]
      );

      await client.query(
        "insert into workspace_members (workspace_id, user_id, role) values ($1, $2, 'owner')",
        [workspaceId, userId]
      );

      await client.query(
        `insert into subscriptions (workspace_id, tier, status)
         values ($1, 'starter', 'inactive')
         on conflict (workspace_id)
         do update set tier = excluded.tier, status = excluded.status, updated_at = now()`,
        [workspaceId]
      );

      return {
        user: { id: userId, email: emailNormalized, name },
        workspace: { id: workspaceId, name: workspaceFinalName, slug },
      };
    });

    const token = await createSessionToken({
      userId: created.user.id,
      email: created.user.email,
      workspaceId: created.workspace.id,
    });
    setSessionCookie(res, token);

    sendJson(res, 201, {
      user: created.user,
      workspace: created.workspace,
      tier: "starter",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      return badRequest(res, error.message);
    }
    serverError(res, error);
  }
}
