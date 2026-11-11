# SecureDesk

SecureDesk is an authenticated personal assistant. Auth0 Universal Login identifies the user, preferences are stored against that Auth0 subject, and the assistant calls server-side tools for those preferences and the current Open-Meteo forecast.

Passwords are never stored in this application. Access tokens and client secrets stay on the server.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui
- PostgreSQL and Drizzle ORM
- Auth0 Next.js SDK v4 (`@auth0/nextjs-auth0`)
- OpenAI Responses API with strict function tools
- Open-Meteo geocoding and forecast APIs

## Setup

### 1. Install and configure the environment

```bash
npm install
cp .env.example .env.local
openssl rand -hex 32
```

Put the `openssl` output in `AUTH0_SECRET`. It must be 64 hexadecimal characters.

### 2. Create the Auth0 application

These steps follow the current Auth0 Next.js quickstart for SDK v4.

1. In the Auth0 dashboard, create an application.
2. Choose **Regular Web Application**.
3. On the application Settings tab, copy:
   - Domain → `AUTH0_DOMAIN` (hostname only, no `https://`)
   - Client ID → `AUTH0_CLIENT_ID`
   - Client Secret → `AUTH0_CLIENT_SECRET`
4. Set these URLs for local development:
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`
   - Allowed Web Origins: `http://localhost:3000`
5. Leave `AUTH0_AUDIENCE` blank unless you create an API with signing algorithm **RS256**. Auth0 then issues an opaque access token for `/userinfo`, and SecureDesk verifies the signed ID token from the server session. Set `AUTH0_AUDIENCE` to a custom API identifier when you want the access token itself to be a JWT.
6. If you create a custom API, authorize this application to request tokens for it.

`AUTH0_AUDIENCE` is not an SDK environment variable in v4. SecureDesk passes a custom API identifier to `new Auth0Client({ authorizationParameters: { audience } })`. With no custom API, the access token is opaque and the API verifies the ID token's issuer, client-id audience, and signature.

Set `APP_BASE_URL=http://localhost:3000`.

### 3. Create the database

```bash
createdb securedesk
npm run db:migrate
```

`DATABASE_URL` must point at that database. The migration creates `user_preferences`.

### 4. OpenAI

Set `OPENAI_API_KEY`. The default model is `gpt-4o`, which supports the Responses API tool calls this app uses. Override it with `OPENAI_MODEL` if your account should use a different Responses-capable model.

### 5. Run

```bash
npm run dev
```

Open `http://localhost:3000` and use **Log in**. That link goes to `/auth/login`, which the Auth0 SDK mounts from `src/proxy.ts`. Logout is `/auth/logout`. The callback is `/auth/callback`.

If Auth0 credentials are missing, `/desk` and `/auth/*` redirect to `/setup`.

## Using the assistant

1. Sign in.
2. On Desk, save a city, ISO country code, IANA timezone, working hours, and temperature unit.
3. Open Assistant and ask:

> What is the weather in my preferred city, and is it suitable for an outdoor meeting during my working hours?

The server authenticates the request, loads that user's preferences, geocodes the saved city, requests Open-Meteo, and gives those results to the model. The tools do not accept a user id.

## Scripts

```bash
npm run dev
npm run build
npm test
npm run db:migrate
```

## Security notes

- Private pages under `/desk` require an Auth0 session.
- `/api/me`, `/api/me/preferences`, `/api/weather`, and `/api/assistant` require a session and a validated access token.
- Token checks use Auth0's JWKS and require issuer `https://AUTH0_DOMAIN/`, the configured audience, and RS256.
- Identity is the `sub` claim. Query and body user ids are rejected.
- Session cookies are `httpOnly`. `sameSite` defaults to `lax`, and `secure` is set in production. The `/auth/access-token` endpoint is disabled so the browser cannot fetch the access token.
- State-changing requests must come from the same origin.
- API responses are `private, no-store`.
- Logs pass through a redactor for authorization headers, cookies, JWTs, and database URLs.
- In-memory rate limits protect the API on a single instance. Set `TRUST_PROXY=true` only when a trusted proxy sets `X-Forwarded-For`.

## Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the request flow and data model.
