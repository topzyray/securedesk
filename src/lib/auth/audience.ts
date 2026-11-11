/**
 * Custom Auth0 API identifier. Blank means Auth0 will issue an opaque access
 * token for /userinfo. That value is not an API audience and does not produce
 * a JWT, so it is ignored here.
 */
export function auth0Audience(): string | undefined {
  const configured = process.env.AUTH0_AUDIENCE?.trim();
  if (!configured) return undefined;
  const domain = process.env.AUTH0_DOMAIN?.trim();
  if (domain && configured === `https://${domain}/userinfo`) return undefined;
  return configured;
}
