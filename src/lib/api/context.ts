import { completeAssistantTurn, openAiConfigured } from "@/lib/ai/openai";
import { requireUser } from "@/lib/auth/require-user";
import type { AppContext } from "@/lib/api/handlers";
import { readPreferences, updatePreferences } from "@/lib/preferences/service";
import { apiRateLimiter } from "@/lib/security/rate-limit";
import { buildWeatherReport, PreferencesRequiredError } from "@/lib/weather/service";

export function createDefaultContext(): AppContext {
  return {
    authenticate: requireUser,
    rateLimit: (key, limit) => apiRateLimiter.check(key, limit, 60_000),
    readPreferences,
    writePreferences: updatePreferences,
    readWeather: async (subject) => {
      const preference = await readPreferences(subject);
      if (!preference) throw new PreferencesRequiredError();
      return buildWeatherReport({ preference });
    },
    runChat: completeAssistantTurn,
    openAiConfigured,
  };
}
