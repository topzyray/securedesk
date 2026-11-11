import { AuthenticationError, AuthConfigurationError, InvalidTokenError } from "@/lib/auth/errors";

export type SessionUser = {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
};

export type SessionReader = {
  getSession: () => Promise<{ user?: SessionUser } | null>;
  getAccessToken: () => Promise<{ token: string }>;
};

export type AuthenticatedUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
};

export async function authenticateRequest(deps: {
  sessions: SessionReader;
  verify: (token: string) => Promise<{ sub: string }>;
}): Promise<AuthenticatedUser> {
  const session = await deps.sessions.getSession();
  const sessionSubject = session?.user?.sub;
  if (!session || !sessionSubject) {
    throw new AuthenticationError();
  }

  let token: string;
  try {
    const accessToken = await deps.sessions.getAccessToken();
    token = accessToken.token;
  } catch (error) {
    if (error instanceof AuthConfigurationError || error instanceof InvalidTokenError) throw error;
    throw new AuthenticationError();
  }

  let verified: { sub: string };
  try {
    verified = await deps.verify(token);
  } catch (error) {
    if (error instanceof AuthConfigurationError) throw error;
    if (error instanceof InvalidTokenError) throw error;
    throw new InvalidTokenError();
  }

  if (verified.sub !== sessionSubject) {
    throw new InvalidTokenError("Access token subject does not match the session.");
  }

  return {
    sub: verified.sub,
    name: session.user?.name,
    email: session.user?.email,
    picture: session.user?.picture,
  };
}
