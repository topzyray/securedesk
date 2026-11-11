import { describe, expect, it } from "vitest";
import { AuthenticationError, AuthConfigurationError, InvalidTokenError } from "@/lib/auth/errors";
import { handleGetMe, handleGetPreferences, handlePatchPreferences, type AppContext } from "@/lib/api/handlers";
import type { UserPreference } from "@/lib/preferences/types";

function preference(subject: string, city: string): UserPreference {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    auth0Subject: subject,
    preferredCity: city,
    preferredCountry: "NG",
    preferredTimezone: "Africa/Lagos",
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    temperatureUnit: "celsius",
    createdAt: new Date("2026-11-10T08:00:00.000Z"),
    updatedAt: new Date("2026-11-10T08:00:00.000Z"),
  };
}

function context(overrides?: Partial<AppContext>): AppContext & { writes: Array<{ subject: string; input: unknown }> } {
  const store = new Map<string, UserPreference>([
    ["auth0|ada", preference("auth0|ada", "Lagos")],
    ["auth0|grace", preference("auth0|grace", "Nairobi")],
  ]);
  const writes: Array<{ subject: string; input: unknown }> = [];
  const base: AppContext = {
    authenticate: async () => ({ sub: "auth0|ada", name: "Ada", email: "ada@example.com" }),
    rateLimit: () => ({ allowed: true, retryAfterSeconds: 0, remaining: 10 }),
    readPreferences: async (subject) => store.get(subject) ?? null,
    writePreferences: async (subject, input) => {
      writes.push({ subject, input });
      const current = store.get(subject) ?? preference(subject, "Lagos");
      const next = { ...current, preferredCity: "Updated", updatedAt: new Date("2026-11-10T09:00:00.000Z") };
      store.set(subject, next);
      return next;
    },
    readWeather: async () => {
      throw new Error("not used");
    },
    runChat: async () => ({ reply: "ok", tools_used: [] }),
    openAiConfigured: () => true,
    ...overrides,
  };
  return Object.assign(base, { writes });
}

const headers = new Headers({ host: "localhost:3000", origin: "http://localhost:3000" });

describe("private API authorization", () => {
  it("rejects an unauthenticated request", async () => {
    const ctx = context({
      authenticate: async () => {
        throw new AuthenticationError();
      },
    });
    const response = await handleGetMe(headers, ctx);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "unauthorized" } });
  });

  it("returns the authenticated user for a valid session", async () => {
    const response = await handleGetMe(headers, context());
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ user: { sub: "auth0|ada", email: "ada@example.com" } });
  });

  it("rejects an invalid token", async () => {
    const ctx = context({
      authenticate: async () => {
        throw new InvalidTokenError();
      },
    });
    const response = await handleGetMe(new Headers(), ctx);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "invalid_token" } });
  });

  it("reports missing Auth0 configuration without accepting the request", async () => {
    const ctx = context({
      authenticate: async () => {
        throw new AuthConfigurationError("Auth0 API audience is not configured.");
      },
    });
    const response = await handleGetMe(new Headers(), ctx);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "auth_not_configured" } });
  });

  it("returns only the authenticated user's preferences", async () => {
    const response = await handleGetPreferences(headers, context());
    expect(response.status).toBe(200);
    const body = (await response.json()) as { preference: { preferred_city: string } };
    expect(body.preference.preferred_city).toBe("Lagos");
  });

  it("does not apply a user id supplied in the browser body", async () => {
    const ctx = context();
    const request = new Request("http://localhost:3000/api/me/preferences", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        host: "localhost:3000",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        auth0_subject: "auth0|grace",
        preferred_city: "Abuja",
        preferred_country: "NG",
        preferred_timezone: "Africa/Lagos",
        working_hours_start: "09:00",
        working_hours_end: "17:00",
        temperature_unit: "celsius",
      }),
    });

    const response = await handlePatchPreferences(request, ctx);
    expect(response.status).toBe(400);
    expect(ctx.writes).toHaveLength(0);
    const grace = await ctx.readPreferences("auth0|grace");
    expect(grace?.preferredCity).toBe("Nairobi");
  });

  it("rejects a cross-origin preference update", async () => {
    const request = new Request("http://localhost:3000/api/me/preferences", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        host: "localhost:3000",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ preferred_city: "Abuja" }),
    });
    const response = await handlePatchPreferences(request, context());
    expect(response.status).toBe(403);
  });

  it("rate limits repeated calls", async () => {
    const ctx = context({
      rateLimit: () => ({ allowed: false, retryAfterSeconds: 12, remaining: 0 }),
    });
    const response = await handleGetMe(headers, ctx);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
  });
});
