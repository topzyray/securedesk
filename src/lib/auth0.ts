import dns from "node:dns";
import { setDefaultAutoSelectFamily } from "node:net";
import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { auth0Audience } from "@/lib/auth/audience";
import { AuthConfigurationError } from "@/lib/auth/errors";

// Node's default Happy Eyeballs lookup tries IPv6 first. This host has AAAA
// records for Auth0 that never connect, so the SDK's 5s discovery fetch aborts
// before IPv4 succeeds. Prefer IPv4 for the official SDK's fetch.
dns.setDefaultResultOrder("ipv4first");
setDefaultAutoSelectFamily(false);

const REQUIRED_ENV = ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET", "AUTH0_SECRET"] as const;

export function isAuth0Configured(): boolean {
  return REQUIRED_ENV.every((name) => Boolean(process.env[name]));
}

function cookieSameSite(): "lax" | "strict" | "none" {
  const value = process.env.AUTH0_COOKIE_SAME_SITE?.toLowerCase();
  if (value === "strict" || value === "none" || value === "lax") return value;
  return "lax";
}

const audience = auth0Audience();

/**
 * Official Auth0 v4 server client. Credentials come from the environment:
 * AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL.
 * Audience is not an SDK environment variable in v4, so it is passed here when set.
 */
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email",
    ...(audience ? { audience } : {}),
  },
  signInReturnToPath: "/desk",
  enableAccessTokenEndpoint: false,
  session: {
    cookie: {
      sameSite: cookieSameSite(),
      ...(process.env.NODE_ENV === "production" || process.env.AUTH0_COOKIE_SECURE === "true"
        ? { secure: true }
        : {}),
    },
  },
});

export function getAuth0(): Auth0Client {
  if (!isAuth0Configured()) {
    throw new AuthConfigurationError(
      "Auth0 is not configured. Set AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET.",
    );
  }

  return auth0;
}
