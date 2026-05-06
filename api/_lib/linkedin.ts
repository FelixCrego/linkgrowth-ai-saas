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
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("LINKEDIN_CLIENT_ID"),
    redirect_uri: callbackUrl,
    scope: "openid profile email w_member_social",
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
  const profileRes = await fetch("https://api.linkedin.com/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) throw new Error(`LinkedIn /me failed: ${profileRes.status}`);
  const profile = (await profileRes.json()) as { id: string };
  return `urn:li:person:${profile.id}`;
}

type LinkedInImageInput = {
  base64?: string;
  mimeType?: string;
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

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  text: string,
  image?: LinkedInImageInput
): Promise<unknown> {
  const hasImage = Boolean(image?.base64);

  if (hasImage) {
    const mimeType = image?.mimeType ?? "image/png";
    const normalizedBase64 = normalizeImageBase64(image!.base64!);
    const bytes = Buffer.from(normalizedBase64, "base64");
    const { asset, uploadUrl } = await registerLinkedInImageUpload(accessToken, authorUrn);

    await uploadLinkedInImageBytes(accessToken, uploadUrl, mimeType, bytes);
    await createLinkedInUgcPost(accessToken, {
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
    return { ok: true };
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

  await createLinkedInUgcPost(accessToken, payload);

  return { ok: true };
}

