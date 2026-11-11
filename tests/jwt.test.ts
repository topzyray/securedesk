import { generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { InvalidTokenError } from "@/lib/auth/errors";
import { selectIdentityToken, verifyJwt } from "@/lib/auth/jwt";

const issuer = "https://tenant.example.auth0.com/";
const audience = "https://securedesk.example/api";

describe("identity token selection", () => {
  it("uses a signed access token when Auth0 issued one", () => {
    expect(selectIdentityToken("a.b.c", "d.e.f")).toEqual({ token: "a.b.c", kind: "access" });
  });

  it("uses the ID token when the access token is opaque", () => {
    expect(selectIdentityToken("opaque-token", "d.e.f")).toEqual({ token: "d.e.f", kind: "id" });
  });

  it("rejects a session with no signed token", () => {
    expect(() => selectIdentityToken("opaque-token", undefined)).toThrow(InvalidTokenError);
  });
});

describe("access token validation", () => {
  it("accepts a token with the expected issuer, audience, and signature", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("auth0|user-a")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    await expect(verifyJwt(token, { key: publicKey, issuer, audience })).resolves.toEqual({
      sub: "auth0|user-a",
    });
  });

  it("rejects a token signed by a different key", async () => {
    const { privateKey } = await generateKeyPair("RS256");
    const { publicKey: otherPublicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("auth0|user-a")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    await expect(verifyJwt(token, { key: otherPublicKey, issuer, audience })).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects the wrong audience and issuer", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("auth0|user-a")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    await expect(
      verifyJwt(token, { key: publicKey, issuer, audience: "https://other.example/api" }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(
      verifyJwt(token, { key: publicKey, issuer: "https://evil.example/", audience }),
    ).rejects.toBeInstanceOf(InvalidTokenError);
  });

  it("rejects expired tokens, opaque tokens, and tokens without a subject", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setSubject("auth0|user-a")
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(privateKey);
    const missingSubject = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);

    await expect(verifyJwt(expired, { key: publicKey, issuer, audience })).rejects.toBeInstanceOf(InvalidTokenError);
    await expect(verifyJwt("opaque-token", { key: publicKey, issuer, audience })).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
    await expect(verifyJwt(missingSubject, { key: publicKey, issuer, audience })).rejects.toBeInstanceOf(
      InvalidTokenError,
    );
  });
});
