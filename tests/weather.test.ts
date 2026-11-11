import { describe, expect, it } from "vitest";
import type { UserPreference } from "@/lib/preferences/types";
import { buildWeatherReport } from "@/lib/weather/service";
import { WeatherProviderError } from "@/lib/weather/open-meteo";
import { assessOutdoorMeeting } from "@/lib/weather/suitability";

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fetchFor(handlers: { geocode?: () => Response | Promise<Response>; forecast?: () => Response | Promise<Response> }): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("geocoding-api.open-meteo.com")) {
      return handlers.geocode?.() ?? jsonResponse({ results: [] });
    }
    return handlers.forecast?.() ?? jsonResponse({});
  }) as typeof fetch;
}

describe("Open-Meteo weather", () => {
  it("uses the saved city and returns suitability from the forecast", async () => {
    const report = await buildWeatherReport({
      preference,
      now: new Date("2026-11-10T13:00:00.000Z"),
      fetchImpl: fetchFor({
        geocode: () =>
          jsonResponse({
            results: [{ name: "Lagos", latitude: 6.45, longitude: 3.4, country_code: "NG", timezone: "Africa/Lagos" }],
          }),
        forecast: () =>
          jsonResponse({
            current: {
              time: "2026-11-10T14:00",
              temperature_2m: 29,
              weather_code: 1,
              wind_speed_10m: 12,
              is_day: 1,
            },
          }),
      }),
    });

    expect(report.city).toBe("Lagos");
    expect(report.temperature).toBe(29);
    expect(report.condition).toBe("Mainly clear");
    expect(report.within_working_hours).toBe(true);
    expect(report.outdoor_meeting_suitable).toBe(true);
  });

  it("returns a timeout when the upstream request is aborted", async () => {
    const fetchImpl = (async () => {
      const error = new Error("timed out");
      error.name = "TimeoutError";
      throw error;
    }) as typeof fetch;

    await expect(buildWeatherReport({ preference, fetchImpl })).rejects.toMatchObject({
      code: "timeout",
    } satisfies Partial<WeatherProviderError>);
  });

  it("returns upstream failure when geocoding responds with an error", async () => {
    await expect(
      buildWeatherReport({
        preference,
        fetchImpl: fetchFor({ geocode: () => jsonResponse({ error: true }, 500) }),
      }),
    ).rejects.toMatchObject({ code: "upstream" });
  });

  it("returns not found when the city cannot be resolved", async () => {
    await expect(
      buildWeatherReport({
        preference,
        fetchImpl: fetchFor({ geocode: () => jsonResponse({ results: [] }) }),
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("outdoor meeting suitability", () => {
  it("rejects rain and times outside working hours", () => {
    const rainy = assessOutdoorMeeting({
      weatherCode: 63,
      temperature: 24,
      temperatureUnit: "celsius",
      windSpeedKmh: 10,
      timezone: "Africa/Lagos",
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      now: new Date("2026-11-10T13:00:00.000Z"),
    });
    const early = assessOutdoorMeeting({
      weatherCode: 0,
      temperature: 22,
      temperatureUnit: "celsius",
      windSpeedKmh: 8,
      timezone: "Africa/Lagos",
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      now: new Date("2026-11-10T04:00:00.000Z"),
    });

    expect(rainy.suitable).toBe(false);
    expect(early.withinWorkingHours).toBe(false);
    expect(early.suitable).toBe(false);
  });

  it("treats an overnight shift as inside working hours", () => {
    const result = assessOutdoorMeeting({
      weatherCode: 0,
      temperature: 70,
      temperatureUnit: "fahrenheit",
      windSpeedKmh: 10,
      timezone: "UTC",
      workingHoursStart: "22:00",
      workingHoursEnd: "06:00",
      now: new Date("2026-11-10T23:30:00.000Z"),
    });
    expect(result.withinWorkingHours).toBe(true);
    expect(result.suitable).toBe(true);
  });
});
