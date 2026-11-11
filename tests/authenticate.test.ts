import { describe, expect, it, vi } from "vitest";
import { authenticateRequest, type SessionReader } from "@/lib/auth/authenticate";
import { AuthConfigurationError, AuthenticationError, InvalidTokenError } from "@/lib/auth/errors";

function sessions(overrides?: Partial<SessionReader>): SessionReader {
  return {
    getSession: async () => ({ user: { sub: "auth0|user-a", name: "Ada", email: "ada@example.com" } }),
    getAccessToken: async () => ({ token: "header.payload.signature" }),
    ...overrides,
  };
}

describe("authenticateRequest", () => {
  it("returns the subject from the validated token", async () => {
    const verify = vi.fn(async () => ({ sub: "auth0|user-a" }));
    const user = await authenticateRequest({ sessions: sessions(), verify });
    expect(user.sub).toBe("auth0|user-a");
    expect(verify).toHaveBeenCalledWith("header.payload.signature");
  });

  it("rejects a missing session", async () => {
    await expect(
      authenticateRequest({
        sessions: sessions({ getSession: async () => null }),
        verify: async () => ({ sub: "auth0|user-a" }),
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("rejects an invalid token", async () => {
    await expect(
      authenticateRequest({
        sessions: sessions(),
        verify: async () => {
          throw new InvalidTokenError();
        },
      }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a token subject that does not match the session", async () => {
    await expect(
      authenticateRequest({
        sessions: sessions(),
        verify: async () => ({ sub: "auth0|user-b" }),
      }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects a failed token lookup without treating it as a valid user", async () => {
    await expect(
      authenticateRequest({
        sessions: sessions({
          getAccessToken: async () => {
            throw new Error("refresh failed");
          },
        }),
        verify: async () => ({ sub: "auth0|user-a" }),
      }),
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it("preserves configuration errors", async () => {
    await expect(
      authenticateRequest({
        sessions: sessions(),
        verify: async () => {
          throw new AuthConfigurationError("Auth0 API audience is not configured.");
        },
      }),
    ).rejects.toBeInstanceOf(AuthConfigurationError);
  });
});
