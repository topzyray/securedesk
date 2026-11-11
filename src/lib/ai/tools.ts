import type { PublicPreference, UserPreference } from "@/lib/preferences/types";
import { toPublicPreference } from "@/lib/preferences/types";
import type { WeatherReport } from "@/lib/weather/service";
import { PreferencesRequiredError } from "@/lib/weather/service";
import { WeatherProviderError } from "@/lib/weather/open-meteo";

export const assistantTools = [
  {
    type: "function" as const,
    name: "get_user_preferences",
    description:
      "Read the signed-in user's saved preferences. The server already knows who is signed in. Do not supply a user id, subject, or email.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "get_current_weather",
    description:
      "Get the current weather for the signed-in user's preferred city and whether it is suitable for an outdoor meeting during their working hours. Do not supply a user id or a city.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [] as string[],
      additionalProperties: false,
    },
  },
];

const IGNORED_ARGUMENT_KEYS = ["user_id", "userId", "auth0_subject", "sub", "subject", "email", "city"];

export function ignoredIdentityArguments(argumentsJson: string): string[] {
  try {
    const parsed = JSON.parse(argumentsJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
    return IGNORED_ARGUMENT_KEYS.filter((key) => key in parsed);
  } catch {
    return [];
  }
}

export type ToolDependencies = {
  loadPreferences: (subject: string) => Promise<UserPreference | null>;
  loadWeather: (subject: string) => Promise<WeatherReport>;
};

function preferencePayload(preference: UserPreference | null): { preference: PublicPreference | null } {
  return { preference: preference ? toPublicPreference(preference) : null };
}

export async function executeAssistantTool(input: {
  name: string;
  subject: string;
  argumentsJson: string;
  dependencies: ToolDependencies;
}): Promise<string> {
  const ignored = ignoredIdentityArguments(input.argumentsJson);

  if (input.name === "get_user_preferences") {
    const preference = await input.dependencies.loadPreferences(input.subject);
    return JSON.stringify({
      ...preferencePayload(preference),
      ignored_arguments: ignored,
    });
  }

  if (input.name === "get_current_weather") {
    try {
      const preference = await input.dependencies.loadPreferences(input.subject);
      if (!preference) {
        return JSON.stringify({
          error: "preferences_required",
          message: "The signed-in user has not saved a preferred city.",
          ignored_arguments: ignored,
        });
      }
      const weather = await input.dependencies.loadWeather(input.subject);
      return JSON.stringify({ weather, ignored_arguments: ignored });
    } catch (error) {
      if (error instanceof PreferencesRequiredError) {
        return JSON.stringify({
          error: "preferences_required",
          message: error.message,
          ignored_arguments: ignored,
        });
      }
      if (error instanceof WeatherProviderError) {
        return JSON.stringify({
          error: error.code,
          message: error.message,
          ignored_arguments: ignored,
        });
      }
      return JSON.stringify({
        error: "weather_unavailable",
        message: "Weather could not be retrieved.",
        ignored_arguments: ignored,
      });
    }
  }

  return JSON.stringify({
    error: "unknown_tool",
    message: "That tool is not available.",
  });
}
