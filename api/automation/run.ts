import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { badRequest, methodNotAllowed, parseJsonBody, sendJson, serverError } from "../_lib/http.js";
import { requireSession } from "../_lib/session.js";
import { runWorkspaceAutomation } from "../_lib/automation.js";

const schema = z.object({
  count: z.number().int().min(1).max(20).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);

  try {
    const session = await requireSession(req, res);
    if (!session) return;

    const parsed = schema.safeParse(await parseJsonBody(req));
    if (!parsed.success) return badRequest(res, "Invalid automation run payload");

    const result = await runWorkspaceAutomation(session.workspaceId, {
      forceCount: parsed.data.count,
      overrideUserId: session.userId,
    });

    sendJson(res, 200, result);
  } catch (error) {
    serverError(res, error);
  }
}
