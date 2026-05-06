import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http";
import { getServiceSupabase } from "../_lib/supabase";
import { createSessionToken, setSessionCookie } from "../_lib/session";

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
    const supabase = getServiceSupabase();

    const existing = await supabase.from("users").select("id").eq("email", email.toLowerCase()).maybeSingle();
    if (existing.data?.id) return badRequest(res, "Email already registered");

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await supabase
      .from("users")
      .insert({ email: email.toLowerCase(), full_name: name, password_hash: passwordHash })
      .select("id,email")
      .single();

    if (createdUser.error || !createdUser.data) throw createdUser.error ?? new Error("Could not create user");

    const slugBase = toSlug(workspaceName ?? `${name.split(" ")[0]} workspace`);
    const workspace = await supabase
      .from("workspaces")
      .insert({
        owner_user_id: createdUser.data.id,
        name: workspaceName ?? `${name.split(" ")[0]}'s Workspace`,
        slug: `${slugBase}-${Math.random().toString(36).slice(2, 8)}`,
      })
      .select("id,name,slug")
      .single();

    if (workspace.error || !workspace.data) throw workspace.error ?? new Error("Could not create workspace");

    const member = await supabase.from("workspace_members").insert({
      workspace_id: workspace.data.id,
      user_id: createdUser.data.id,
      role: "owner",
    });
    if (member.error) throw member.error;

    const sub = await supabase.from("subscriptions").upsert({ workspace_id: workspace.data.id, tier: "starter", status: "inactive" });
    if (sub.error) throw sub.error;

    const token = await createSessionToken({ userId: createdUser.data.id, email: createdUser.data.email, workspaceId: workspace.data.id });
    setSessionCookie(res, token);

    sendJson(res, 201, {
      user: { id: createdUser.data.id, email: createdUser.data.email, name },
      workspace: workspace.data,
      tier: "starter",
    });
  } catch (error) {
    serverError(res, error);
  }
}
