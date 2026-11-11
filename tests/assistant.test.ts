import { describe, expect, it, vi } from "vitest";
import { runAssistant, type AssistantModelClient } from "@/lib/ai/assistant";
import { executeAssistantTool } from "@/lib/ai/tools";
import type { UserPreference } from "@/lib/preferences/types";
import { WeatherProviderError } from "@/lib/weather/open-meteo";
import type { WeatherReport } from "@/lib/weather/service";

const preference: UserPreference = {
  id: "11111111-1111-1111-1111-111111111111",
  auth0Subject: "auth0|ada",
  preferredCity: "Lagos",
  preferredCountry: "NG",
  preferredTimezone: "Africa/Lagos",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  temperatureUnit: "celsius",
  createdAt: new Date("2026-11-10T08:00:00.000Z"),
  updatedAt: new Date("2026-11-10T08:00:00.000Z"),
};

const weather: WeatherReport = {
  city: "Lagos",
  country: "NG",
  resolved_name: "Lagos",
  latitude: 6.45,
  longitude: 3.4,
  timezone: "Africa/Lagos",
  temperature: 29,
  temperature_unit: "celsius",
  weather_code: 1,
  condition: "Mainly clear",
  wind_speed_kmh: 12,
  is_day: true,
  observed_at: "2026-11-10T14:00",
  local_time: "2026-11-10 14:00",
  working_hours: { start: "09:00", end: "17:00" },
  within_working_hours: true,
  outdoor_meeting_suitable: true,
  suitability_reasons: ["Temperature is comfortable for being outside."],
};

describe("assistant tools", () => {
  it("executes tools for the authenticated subject and ignores a model-supplied user id", async () => {
    const loadPreferences = vi.fn(async (subject: string) => {
      expect(subject).toBe("auth0|ada");
      return preference;
    });
    const loadWeather = vi.fn(async (subject: string) => {
      expect(subject).toBe("auth0|ada");
      return weather;
    });

    let round = 0;
    const client: AssistantModelClient = {
      responses: {
        create: async () => {
          round += 1;
          if (round === 1) {
            return {
              output: [
                {
                  type: "function_call",
                  name: "get_user_preferences",
                  arguments: JSON.stringify({ user_id: "auth0|grace", city: "Paris" }),
                  call_id: "call-preferences",
                },
                {
                  type: "function_call",
                  name: "get_current_weather",
                  arguments: "{}",
                  call_id: "call-weather",
                },
              ],
            };
          }
          return {
            output: [],
            output_text: "Lagos is 29 C and mainly clear. An outdoor meeting during working hours is suitable.",
          };
        },
      },
    };

    const result = await runAssistant({
      subject: "auth0|ada",
      messages: [
        {
          role: "user",
          content:
            "What is the weather in my preferred city, and is it suitable for an outdoor meeting during my working hours?",
        },
      ],
      client,
      model: "gpt-4o",
      dependencies: { loadPreferences, loadWeather },
    });

    expect(loadPreferences).toHaveBeenCalledWith("auth0|ada");
    expect(loadWeather).toHaveBeenCalledWith("auth0|ada");
    expect(result.tools_used).toEqual(["get_user_preferences", "get_current_weather"]);
    expect(result.reply).toContain("29 C");
  });

  it("returns a weather failure to the model instead of inventing a forecast", async () => {
    const seenOutputs: string[] = [];
    const client: AssistantModelClient = {
      responses: {
        create: async ({ input }) => {
          const outputs = input.filter(
            (item): item is { type: string; output: string } =>
              typeof item === "object" && item !== null && "type" in item && item.type === "function_call_output",
          );
          if (outputs.length === 0) {
            return {
              output: [
                {
                  type: "function_call",
                  name: "get_current_weather",
                  arguments: "{}",
                  call_id: "call-weather",
                },
              ],
            };
          }
          seenOutputs.push(outputs[0].output);
          return { output: [], output_text: "I could not retrieve the weather." };
        },
      },
    };

    const result = await runAssistant({
      subject: "auth0|ada",
      messages: [{ role: "user", content: "What is the weather?" }],
      client,
      model: "gpt-4o",
      dependencies: {
        loadPreferences: async () => preference,
        loadWeather: async () => {
          throw new WeatherProviderError("timeout", "The weather service timed out.");
        },
      },
    });

    expect(seenOutputs[0]).toContain("timeout");
    expect(result.reply).toContain("could not retrieve");
  });

  it("does not query another user when the tool arguments name one", async () => {
    const output = await executeAssistantTool({
      name: "get_user_preferences",
      subject: "auth0|ada",
      argumentsJson: JSON.stringify({ auth0_subject: "auth0|grace" }),
      dependencies: {
        loadPreferences: async (subject) => (subject === "auth0|ada" ? preference : null),
        loadWeather: async () => weather,
      },
    });
    const parsed = JSON.parse(output) as { preference: { preferred_city: string }; ignored_arguments: string[] };
    expect(parsed.preference.preferred_city).toBe("Lagos");
    expect(parsed.ignored_arguments).toContain("auth0_subject");
  });
});
