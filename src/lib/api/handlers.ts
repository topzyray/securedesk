import { z } from "zod";
import { AuthenticationError, AuthConfigurationError, InvalidTokenError } from "@/lib/auth/errors";
import type { AuthenticatedUser } from "@/lib/auth/authenticate";
import type { AssistantResult, ChatMessage } from "@/lib/ai/assistant";
import { errorResponse, json } from "@/lib/http/json";
import { logError } from "@/lib/security/redact";
import { clientKey, rejectCrossOrigin } from "@/lib/security/origin";
import type { RateLimitDecision } from "@/lib/security/rate-limit";
import { toPublicPreference, type UserPreference } from "@/lib/preferences/types";
import { parsePreferencePatch, PreferenceValidationError } from "@/lib/preferences/validation";
import { PreferencesRequiredError, weatherErrorStatus, type WeatherReport } from "@/lib/weather/service";
import { WeatherProviderError } from "@/lib/weather/open-meteo";

function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

export type AppContext = {
  authenticate: () => Promise<AuthenticatedUser>;
  rateLimit: (key: string, limit: number) => RateLimitDecision;
  readPreferences: (subject: string) => Promise<UserPreference | null>;
  writePreferences: (subject: string, input: unknown) => Promise<UserPreference>;
  readWeather: (subject: string) => Promise<WeatherReport>;
  runChat: (input: { subject: string; messages: ChatMessage[] }) => Promise<AssistantResult>;
  openAiConfigured: () => boolean;
};

const chatSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000),
        }),
      )
      .min(1)
      .max(20),
  })
  .strict();

async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new PreferenceValidationError("Content-Type must be application/json.");
  }
  try {
    return await request.json();
  } catch {
    throw new PreferenceValidationError("Request body must be valid JSON.");
  }
}

function rateLimited(decision: RateLimitDecision): Response | null {
  if (decision.allowed) return null;
  return json(
    { error: { code: "rate_limited", message: "Too many requests. Try again shortly." } },
    429,
    { "retry-after": String(decision.retryAfterSeconds) },
  );
}

async function authorize(headers: Headers, ctx: AppContext, bucket: string, limit: number): Promise<AuthenticatedUser | Response> {
  const ipDecision = ctx.rateLimit(`${bucket}:ip:${clientKey(headers)}`, limit);
  const ipLimited = rateLimited(ipDecision);
  if (ipLimited) return ipLimited;

  try {
    const user = await ctx.authenticate();
    const userDecision = ctx.rateLimit(`${bucket}:user:${user.sub}`, limit);
    const userLimited = rateLimited(userDecision);
    if (userLimited) return userLimited;
    return user;
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return errorResponse(503, "auth_not_configured", error.message);
    }
    if (error instanceof InvalidTokenError) {
      return errorResponse(401, "invalid_token", error.message);
    }
    if (error instanceof AuthenticationError) {
      return errorResponse(401, "unauthorized", "Authentication required.");
    }
    logError("authentication_failed", { name: error instanceof Error ? error.name : "Error" });
    return errorResponse(401, "unauthorized", "Authentication required.");
  }
}

function publicUser(user: AuthenticatedUser) {
  return {
    sub: user.sub,
    name: user.name ?? null,
    email: user.email ?? null,
    picture: user.picture ?? null,
  };
}

export async function handleGetMe(headers: Headers, ctx: AppContext): Promise<Response> {
  const auth = await authorize(headers, ctx, "me", 60);
  if (auth instanceof Response) return auth;
  return json({ user: publicUser(auth) });
}

export async function handleGetPreferences(headers: Headers, ctx: AppContext): Promise<Response> {
  const auth = await authorize(headers, ctx, "preferences-read", 60);
  if (auth instanceof Response) return auth;

  try {
    const preference = await ctx.readPreferences(auth.sub);
    if (!preference) {
      return errorResponse(404, "preferences_not_found", "No preferences have been saved yet.");
    }
    return json({ preference: toPublicPreference(preference) });
  } catch (error) {
    logError("preference_read_failed", { name: error instanceof Error ? error.name : "Error", code: postgresCode(error) });
    return errorResponse(503, "unavailable", "Preferences could not be loaded.");
  }
}

export async function handlePatchPreferences(request: Request, ctx: AppContext): Promise<Response> {
  const crossOrigin = rejectCrossOrigin(request.headers);
  if (crossOrigin) return crossOrigin;

  const auth = await authorize(request.headers, ctx, "preferences-write", 30);
  if (auth instanceof Response) return auth;

  try {
    const body = await readBody(request);
    const patch = parsePreferencePatch(body);
    const preference = await ctx.writePreferences(auth.sub, patch);
    return json({ preference: toPublicPreference(preference) });
  } catch (error) {
    if (error instanceof PreferenceValidationError) {
      return errorResponse(400, "invalid_preferences", error.message);
    }
    logError("preference_write_failed", { name: error instanceof Error ? error.name : "Error", code: postgresCode(error) });
    return errorResponse(503, "unavailable", "Preferences could not be saved.");
  }
}

export async function handleGetWeather(headers: Headers, ctx: AppContext): Promise<Response> {
  const auth = await authorize(headers, ctx, "weather", 20);
  if (auth instanceof Response) return auth;

  try {
    const preference = await ctx.readPreferences(auth.sub);
    if (!preference) throw new PreferencesRequiredError();
    const weather = await ctx.readWeather(auth.sub);
    return json({ weather });
  } catch (error) {
    if (error instanceof PreferencesRequiredError) {
      return errorResponse(409, "preferences_required", error.message);
    }
    if (error instanceof WeatherProviderError) {
      return errorResponse(weatherErrorStatus(error), error.code, error.message);
    }
    logError("weather_failed", { name: error instanceof Error ? error.name : "Error" });
    return errorResponse(502, "upstream", "The weather service is unavailable.");
  }
}

export async function handlePostAssistant(request: Request, ctx: AppContext): Promise<Response> {
  const crossOrigin = rejectCrossOrigin(request.headers);
  if (crossOrigin) return crossOrigin;

  const auth = await authorize(request.headers, ctx, "assistant", 10);
  if (auth instanceof Response) return auth;

  if (!ctx.openAiConfigured()) {
    return errorResponse(503, "assistant_not_configured", "Set OPENAI_API_KEY to use the assistant.");
  }

  try {
    const body = await readBody(request);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(400, "invalid_chat", parsed.error.issues[0]?.message ?? "Chat request is invalid.");
    }
    const result = await ctx.runChat({ subject: auth.sub, messages: parsed.data.messages });
    return json(result);
  } catch (error) {
    if (error instanceof PreferenceValidationError) {
      return errorResponse(400, "invalid_chat", error.message);
    }
    logError("assistant_failed", { name: error instanceof Error ? error.name : "Error" });
    return errorResponse(502, "assistant_unavailable", "The assistant could not complete the request.");
  }
}
