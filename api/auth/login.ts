import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { createSessionToken, setSessionCookie } from "../_lib/session.js";
import { sql } from "../_lib/db.js";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

type UserRow = { id: string; email: string; full_name: string; password_hash: string };

type MemberRow = { workspace_id: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid login payload");

    const email = parsed.data.email.toLowerCase();

    const userRes = await sql<UserRow>(
      "select id, email, full_name, password_hash from users where email = $1 limit 1",
      [email]
    );

    const user = userRes.rows[0];
    if (!user) return badRequest(res, "Invalid email or password");

    const ok = await bcrypt.compare(parsed.data.password, user.password_hash);
    if (!ok) return badRequest(res, "Invalid email or password");

    const memberRes = await sql<MemberRow>(
      "select workspace_id from workspace_members where user_id = $1 order by created_at asc limit 1",
      [user.id]
    );
    const member = memberRes.rows[0];
    if (!member) throw new Error("No workspace membership found");

    const token = await createSessionToken({ userId: user.id, email: user.email, workspaceId: member.workspace_id });
    setSessionCookie(res, token);

    sendJson(res, 200, {
      user: { id: user.id, email: user.email, name: user.full_name },
      workspaceId: member.workspace_id,
    });
  } catch (error) {
    serverError(res, error);
  }
}
