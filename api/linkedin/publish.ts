import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { publishLinkedInPost } from "../_lib/linkedin.js";
import { sql } from "../_lib/db.js";

const schema = z
  .object({
    text: z.string().min(3).max(3000),
    postLink: z.preprocess(
      (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
      z.string().trim().url().max(2048).optional()
    ),
    imageBase64: z.string().min(100).optional(),
    imageMimeType: z.string().regex(/^image\/(png|jpeg|jpg|webp)$/i).optional(),
  })
  .refine((value) => !value.imageMimeType || Boolean(value.imageBase64), {
    message: "imageBase64 is required when imageMimeType is provided",
    path: ["imageBase64"],
  });

type LinkedInRow = { access_token: string; linkedin_member_urn: string };
type PgError = Error & { code?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid publish payload");

    const accountRes = await sql<LinkedInRow>(
      "select access_token, linkedin_member_urn from linkedin_accounts where workspace_id = $1 limit 1",
      [session.workspaceId]
    );

    const account = accountRes.rows[0];
    if (!account) return badRequest(res, "LinkedIn is not connected");

    const publishText = parsed.data.postLink ? `${parsed.data.text}\n\n${parsed.data.postLink}` : parsed.data.text;

    const publishResult = await publishLinkedInPost(account.access_token, account.linkedin_member_urn, publishText, {
      base64: parsed.data.imageBase64,
      mimeType: parsed.data.imageMimeType,
    });

    try {
      await sql(
        "insert into linkedin_post_events (workspace_id, user_id, content, has_image, post_urn) values ($1, $2, $3, $4, $5)",
        [session.workspaceId, session.userId, publishText, Boolean(parsed.data.imageBase64), publishResult.postUrn]
      );
    } catch (error) {
      const pgError = error as PgError;
      if (pgError.code !== "42P01") throw error;
    }

    sendJson(res, 200, { ok: true });
  } catch (error) {
    serverError(res, error);
  }
}
