import * as crypto from "node:crypto";

export interface AnalysisCredentialPayload {
  analysisId: string;
  orgId: string;
  supabaseToken?: string;
  iat: number;
  exp: number;
}

function getSigningSecret(): string {
  const secret = process.env.AGENT_SIGNING_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "Neither AGENT_SIGNING_SECRET nor CLERK_SECRET_KEY is configured in the environment."
    );
  }
  return secret;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  return Buffer.from(b64, "base64").toString("utf8");
}

/**
 * Mint a short-lived signed credential naming exactly one analysis and its owning organization.
 * Signed with HMAC-SHA256 to prevent tampering.
 */
export async function mintAnalysisCredential(params: {
  analysisId: string;
  orgId: string;
  supabaseToken?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { analysisId, orgId, supabaseToken, expiresInSeconds = 600 } = params;
  const now = Math.floor(Date.now() / 1000);

  const payload: AnalysisCredentialPayload = {
    analysisId,
    orgId,
    ...(supabaseToken ? { supabaseToken } : {}),
    iat: now,
    exp: now + expiresInSeconds,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const secret = getSigningSecret();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and decode a signed analysis credential.
 * Rejects expired tokens or invalid signatures.
 */
export async function verifyAnalysisCredential(
  token: string
): Promise<AnalysisCredentialPayload> {
  if (!token || typeof token !== "string") {
    throw new Error("Missing credential token.");
  }

  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    throw new Error("Malformed credential token format.");
  }

  const [payloadB64, signature] = parts;
  const secret = getSigningSecret();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid credential signature.");
  }

  const rawJson = base64UrlDecode(payloadB64);
  const payload = JSON.parse(rawJson) as AnalysisCredentialPayload;

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    throw new Error("Analysis credential has expired.");
  }

  if (!payload.analysisId || !payload.orgId) {
    throw new Error("Credential payload is missing analysisId or orgId.");
  }

  return payload;
}

