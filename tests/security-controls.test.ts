import { describe, expect, it } from "vitest";
import { redact, redactString } from "@/lib/security/redact";
import { SlidingWindowRateLimiter } from "@/lib/security/rate-limit";

describe("secret redaction", () => {
  it("removes bearer tokens, JWTs, cookies, and database URLs", () => {
    const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdXRoMHxhZGEifQ.signaturevalue";
    const input = {
      authorization: `Bearer ${token}`,
      cookie: "__session=encrypted-session",
      nested: {
        DATABASE_URL: "postgres://postgres:secret@localhost:5432/securedesk",
        note: `token ${token}`,
      },
    };

    const cleaned = redact(input) as {
      authorization: string;
      cookie: string;
      nested: { DATABASE_URL: string; note: string };
    };

    expect(cleaned.authorization).toBe("[redacted]");
    expect(cleaned.cookie).toBe("[redacted]");
    expect(cleaned.nested.DATABASE_URL).toBe("postgres://[redacted]");
    expect(cleaned.nested.note).not.toContain(token);
    expect(redactString(`Bearer ${token}`)).toBe("Bearer [redacted]");
  });
});

describe("rate limiting", () => {
  it("blocks the next call after the limit inside the window", () => {
    let now = 1_000;
    const limiter = new SlidingWindowRateLimiter(() => now);
    expect(limiter.check("ada", 2, 60_000).allowed).toBe(true);
    expect(limiter.check("ada", 2, 60_000).allowed).toBe(true);
    const blocked = limiter.check("ada", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(limiter.check("grace", 2, 60_000).allowed).toBe(true);

    now += 61_000;
    expect(limiter.check("ada", 2, 60_000).allowed).toBe(true);
  });
});
