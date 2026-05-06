import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { getServiceSupabase } from "../_lib/supabase.js";
import { createSessionToken, setSessionCookie } from "../_lib/session.js";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid login payload");

    const supabase = getServiceSupabase();
    const userRes = await supabase
      .from("users")
      .select("id,email,full_name,password_hash")
      .eq("email", parsed.data.email.toLowerCase())
      .maybeSingle();

    if (userRes.error) throw userRes.error;
    if (!userRes.data) return badRequest(res, "Invalid email or password");

    const ok = await bcrypt.compare(parsed.data.password, userRes.data.password_hash);
    if (!ok) return badRequest(res, "Invalid email or password");

    const memberRes = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userRes.data.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberRes.error || !memberRes.data) throw memberRes.error ?? new Error("No workspace membership found");

    const workspaceId = memberRes.data.workspace_id as string;
    const token = await createSessionToken({ userId: userRes.data.id, email: userRes.data.email, workspaceId });
    setSessionCookie(res, token);

    sendJson(res, 200, {
      user: { id: userRes.data.id, email: userRes.data.email, name: userRes.data.full_name },
      workspaceId,
    });
  } catch (error) {
    serverError(res, error);
  }
}

