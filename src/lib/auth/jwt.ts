import { jwtVerify, type JWTPayload } from "jose";
import { auth0Audience } from "@/lib/auth/audience";
import { AuthConfigurationError, InvalidTokenError } from "@/lib/auth/errors";

type VerifyOptions = {
  key: Parameters<typeof jwtVerify>[1];
  issuer: string;
  audience: string;
  clockTolerance?: number;
};

function subjectFromPayload(payload: JWTPayload): string {
  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new InvalidTokenError("Access token is missing a subject.");
  }
  return payload.sub;
}

function isJwt(token: string | undefined): token is string {
  return Boolean(token && token.split(".").length === 3);
}

/**
 * Auth0 issues an opaque access token when the audience is the tenant userinfo
 * endpoint. A custom API audience is what makes the access token a JWT. Until
 * that exists, the ID token stored in the server session is the signed JWT.
 */
export function selectIdentityToken(accessToken?: string, idToken?: string): { token: string; kind: "access" | "id" } {
  if (isJwt(accessToken)) return { token: accessToken, kind: "access" };
  if (isJwt(idToken)) return { token: idToken, kind: "id" };
  throw new InvalidTokenError("Auth0 did not provide a signed token for this session.");
}

export async function verifyJwt(token: string, options: VerifyOptions): Promise<{ sub: string }> {
  if (!isJwt(token)) {
    throw new InvalidTokenError("Auth0 did not provide a signed token for this session.");
  }

  try {
    const { payload } = await jwtVerify(token, options.key, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: ["RS256"],
      clockTolerance: options.clockTolerance,
    });
    return { sub: subjectFromPayload(payload) };
  } catch (error) {
    if (error instanceof InvalidTokenError) throw error;
    throw new InvalidTokenError("Access token failed validation.");
  }
}

let remoteJwks: ReturnType<typeof import("jose").createRemoteJWKSet> | null = null;

async function getRemoteJwks(domain: string) {
  if (!remoteJwks) {
    const { createRemoteJWKSet } = await import("jose");
    remoteJwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
  }
  return remoteJwks;
}

export function resetJwksCache(): void {
  remoteJwks = null;
}

export async function verifyIdentityToken(token: string, kind: "access" | "id"): Promise<{ sub: string }> {
  const domain = process.env.AUTH0_DOMAIN?.trim();
  const audience = kind === "id" ? process.env.AUTH0_CLIENT_ID?.trim() : auth0Audience();
  if (!domain || !audience) {
    throw new AuthConfigurationError(
      kind === "id"
        ? "Auth0 client is not configured. Set AUTH0_DOMAIN and AUTH0_CLIENT_ID."
        : "Auth0 API audience is not configured. Set AUTH0_DOMAIN and AUTH0_AUDIENCE.",
    );
  }

  const jwks = await getRemoteJwks(domain);
  return verifyJwt(token, {
    key: jwks,
    issuer: `https://${domain}/`,
    audience,
    clockTolerance: 60,
  });
}

export async function verifyAccessToken(token: string): Promise<{ sub: string }> {
  return verifyIdentityToken(token, "access");
}
