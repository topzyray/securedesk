import { authenticateRequest, type AuthenticatedUser } from "@/lib/auth/authenticate";
import { selectIdentityToken, verifyIdentityToken } from "@/lib/auth/jwt";
import { getAuth0 } from "@/lib/auth0";

export async function requireUser(): Promise<AuthenticatedUser> {
  const auth0 = getAuth0();
  const session = await auth0.getSession();
  const identity = session
    ? selectIdentityToken(session.tokenSet.accessToken, session.tokenSet.idToken)
    : null;

  return authenticateRequest({
    sessions: {
      getSession: async () => {
        if (!session?.user.sub) return null;
        return {
          user: {
            sub: session.user.sub,
            name: session.user.name,
            email: session.user.email,
            picture: session.user.picture,
          },
        };
      },
      getAccessToken: async () => {
        if (!identity) {
          throw new Error("No session token.");
        }
        return { token: identity.token };
      },
    },
    verify: (token) => verifyIdentityToken(token, identity?.kind ?? "id"),
  });
}
