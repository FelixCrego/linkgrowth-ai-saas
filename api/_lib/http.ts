import type { VercelRequest, VercelResponse } from "@vercel/node";

export async function parseJsonBody<T = Record<string, unknown>>(req: VercelRequest): Promise<T> {
  if (!req.body) return {} as T;
  if (typeof req.body === "object") return req.body as T;
  if (typeof req.body === "string") return JSON.parse(req.body) as T;
  return JSON.parse(String(req.body)) as T;
}

export function sendJson(res: VercelResponse, status: number, data: unknown): void {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.send(JSON.stringify(data));
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  res.setHeader("Allow", allowed.join(", "));
  sendJson(res, 405, { error: "Method not allowed" });
}

export function unauthorized(res: VercelResponse, message = "Unauthorized"): void {
  sendJson(res, 401, { error: message });
}

export function badRequest(res: VercelResponse, message: string): void {
  sendJson(res, 400, { error: message });
}

export function serverError(res: VercelResponse, error: unknown): void {
  const message = error instanceof Error ? error.message : "Internal server error";
  sendJson(res, 500, { error: message });
}
