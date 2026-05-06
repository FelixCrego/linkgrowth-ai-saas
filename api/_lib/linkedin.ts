import { appUrl, requireEnv } from "./env.js";

const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function linkedinCallbackUrl(): string {
  return `${appUrl()}/api/linkedin/callback`;
}

export function linkedinAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    redirect_uri: linkedinCallbackUrl(),
    scope: "openid profile email w_member_social",
    state,
  });
  return `${LINKEDIN_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: linkedinCallbackUrl(),
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    client_secret: requireEnv("LINKEDIN_CLIENT_SECRET"),
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error(`LinkedIn token exchange failed: ${response.status}`);
  return (await response.json()) as { access_token: string; expires_in: number };
}

export async function fetchLinkedInMemberUrn(accessToken: string): Promise<string> {
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) throw new Error(`LinkedIn /me failed: ${profileRes.status}`);
  const profile = (await profileRes.json()) as { id: string };
  return `urn:li:person:${profile.id}`;
}

export async function publishLinkedInPost(accessToken: string, authorUrn: string, text: string): Promise<unknown> {
  const payload = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(`LinkedIn publish failed: ${response.status} ${textBody}`);
  }

  return { ok: true };
}

