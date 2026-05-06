import type { VercelRequest } from "@vercel/node";
import { appUrl, optionalEnv, requireEnv } from "./env.js";

const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

export function linkedinCallbackUrl(): string {
  const explicit = optionalEnv("LINKEDIN_REDIRECT_URI");
  if (explicit) return explicit;
  return `${appUrl()}/api/linkedin/callback`;
}

export function resolveAppUrlFromRequest(req: VercelRequest): string {
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto ?? "https";

  if (host && typeof host === "string") {
    return `${proto}://${host}`;
  }

  return appUrl();
}

export function linkedinCallbackUrlForRequest(req: VercelRequest): string {
  const explicit = optionalEnv("LINKEDIN_REDIRECT_URI");
  if (explicit) return explicit;
  const baseUrl = resolveAppUrlFromRequest(req);
  return `${baseUrl.replace(/\/$/, "")}/api/linkedin/callback`;
}

export function linkedinAuthUrl(state: string, callbackUrl = linkedinCallbackUrl()): string {
  const extraScopes = (optionalEnv("LINKEDIN_EXTRA_SCOPES") ?? "")
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const scope = ["openid", "profile", "email", "w_member_social", ...extraScopes].join(" ");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    redirect_uri: callbackUrl,
    scope,
    state,
  });
  return `${LINKEDIN_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string,
  callbackUrl = linkedinCallbackUrl()
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl,
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
  const userInfoRes = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (userInfoRes.ok) {
    const userInfo = (await userInfoRes.json()) as { sub?: string };
    if (userInfo.sub && typeof userInfo.sub === "string") {
      return `urn:li:person:${userInfo.sub}`;
    }
  }

  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    throw new Error(`LinkedIn member lookup failed: userinfo=${userInfoRes.status} me=${profileRes.status}`);
  }
  const profile = (await profileRes.json()) as { id: string };
  return `urn:li:person:${profile.id}`;
}

type LinkedInImageInput = {
  base64?: string;
  mimeType?: string;
};

export type LinkedInMemberAnalytics = {
  followerCount: number | null;
  followerDeltaLast7Days: number | null;
  available: boolean;
  error: string | null;
};

type RegisterUploadResponse = {
  value?: {
    asset?: string;
    uploadMechanism?: {
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"?: {
        uploadUrl?: string;
      };
    };
  };
};

function normalizeImageBase64(input: string): string {
  const commaIndex = input.indexOf(",");
  return commaIndex >= 0 ? input.slice(commaIndex + 1) : input;
}

async function registerLinkedInImageUpload(accessToken: string, authorUrn: string): Promise<{ asset: string; uploadUrl: string }> {
  const response = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      registerUploadRequest: {
        owner: authorUrn,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  });

  const json = (await response.json()) as RegisterUploadResponse;
  if (!response.ok) throw new Error(`LinkedIn register upload failed: ${response.status}`);

  const asset = json.value?.asset;
  const uploadUrl = json.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  if (!asset || !uploadUrl) throw new Error("LinkedIn register upload returned incomplete response");

  return { asset, uploadUrl };
}

async function uploadLinkedInImageBytes(accessToken: string, uploadUrl: string, contentType: string, bytes: Uint8Array): Promise<void> {
  let response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body: bytes,
  });

  if (!response.ok) {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: bytes,
    });
  }

  if (!response.ok) {
    const textBody = await response.text();
    throw new Error(`LinkedIn image upload failed: ${response.status} ${textBody}`);
  }
}

async function createLinkedInUgcPost(accessToken: string, payload: Record<string, unknown>): Promise<void> {
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
}

async function createLinkedInUgcPostWithId(accessToken: string, payload: Record<string, unknown>): Promise<string | null> {
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

  const restliId = response.headers.get("x-restli-id");
  if (restliId && restliId.startsWith("urn:li:")) return restliId;
  if (restliId) return `urn:li:ugcPost:${restliId}`;

  try {
    const body = (await response.json()) as { id?: string };
    if (body.id && body.id.startsWith("urn:li:")) return body.id;
    if (body.id) return `urn:li:ugcPost:${body.id}`;
  } catch {
    // no-op
  }

  return null;
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  image?: LinkedInImageInput
): Promise<{ ok: true; postUrn: string | null }> {
  const hasImage = Boolean(image?.base64);

  if (hasImage) {
    const mimeType = image?.mimeType ?? "image/png";
    const normalizedBase64 = normalizeImageBase64(image!.base64!);
    const bytes = Buffer.from(normalizedBase64, "base64");
    const { asset, uploadUrl } = await registerLinkedInImageUpload(accessToken, authorUrn);

    await uploadLinkedInImageBytes(accessToken, uploadUrl, mimeType, bytes);
    const postUrn = await createLinkedInUgcPostWithId(accessToken, {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: "IMAGE",
          media: [{ status: "READY", media: asset }],
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    });
    return { ok: true, postUrn };
  }

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

  const postUrn = await createLinkedInUgcPostWithId(accessToken, payload);

  return { ok: true, postUrn };
}

function linkedInVersionHeader(): string {
  const configured = optionalEnv("LINKEDIN_API_VERSION");
  if (configured) return configured;
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

type MemberFollowerCountResponse = {
  elements?: Array<{ memberFollowersCount?: number }>;
};

export async function fetchLinkedInMemberAnalytics(accessToken: string): Promise<LinkedInMemberAnalytics> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-Restli-Protocol-Version": "2.0.0",
    "Linkedin-Version": linkedInVersionHeader(),
    "Content-Type": "application/json",
  };

  const lifetimeRes = await fetch("https://api.linkedin.com/rest/memberFollowersCount?q=me", { headers });
  if (!lifetimeRes.ok) {
    const body = await lifetimeRes.text();
    return {
      followerCount: null,
      followerDeltaLast7Days: null,
      available: false,
      error: `memberFollowersCount unavailable (${lifetimeRes.status}) ${body}`,
    };
  }

  const lifetimeJson = (await lifetimeRes.json()) as MemberFollowerCountResponse;
  const followerCount = lifetimeJson.elements?.[0]?.memberFollowersCount ?? null;

  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const dateRange = `(start:(year:${start.getUTCFullYear()},month:${start.getUTCMonth() + 1},day:${start.getUTCDate()}),end:(year:${end.getUTCFullYear()},month:${end.getUTCMonth() + 1},day:${end.getUTCDate()}))`;
  const rangeUrl = `https://api.linkedin.com/rest/memberFollowersCount?q=dateRange&dateRange=${encodeURIComponent(dateRange)}`;
  const rangeRes = await fetch(rangeUrl, { headers });

  if (!rangeRes.ok) {
    return {
      followerCount,
      followerDeltaLast7Days: null,
      available: true,
      error: null,
    };
  }

  const rangeJson = (await rangeRes.json()) as MemberFollowerCountResponse;
  const followerDeltaLast7Days = (rangeJson.elements ?? []).reduce((sum, element) => sum + (element.memberFollowersCount ?? 0), 0);

  return {
    followerCount,
    followerDeltaLast7Days,
    available: true,
    error: null,
  };
}

