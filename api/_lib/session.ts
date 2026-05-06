import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SignJWT, jwtVerify } from "jose";
import { requireEnv } from "./env.js";
import { unauthorized } from "./http.js";

const COOKIE_NAME = "lg_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = { userId: string; email: string; workspaceId: string };

function sessionSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_AGE_SECONDS}s`)
    .sign(sessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser> {
  const verified = await jwtVerify(token, sessionSecret());
  const payload = verified.payload as SessionUser;
  if (!payload.userId || !payload.email || !payload.workspaceId) {
    throw new Error("Invalid session payload");
  }
  return payload;
}

function parseCookies(req: VercelRequest): Record<string, string> {
  const raw = req.headers.cookie ?? "";
  return raw.split(";").reduce<Record<string, string>>((acc, entry) => {
    const [key, ...value] = entry.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(value.join("="));
    return acc;
  }, {});
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_AGE_SECONDS}`,
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: VercelResponse): void {
  const isProd = process.env.NODE_ENV === "production";
  const cookie = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export async function requireSession(req: VercelRequest, res: VercelResponse): Promise<SessionUser | null> {
  try {
    const cookies = parseCookies(req);
    const token = cookies[COOKIE_NAME];
    if (!token) {
      unauthorized(res);
      return null;
    }
    return await verifySessionToken(token);
  } catch {
    unauthorized(res);
    return null;
  }
}

