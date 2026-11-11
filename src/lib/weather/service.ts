import type { UserPreference } from "@/lib/preferences/types";
import { describeWeatherCode } from "@/lib/weather/codes";
import { fetchCurrentWeather, geocodeCity, type WeatherProviderError } from "@/lib/weather/open-meteo";
import { assessOutdoorMeeting } from "@/lib/weather/suitability";

export type WeatherReport = {
  city: string;
  country: string;
  resolved_name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  temperature: number;
  temperature_unit: UserPreference["temperatureUnit"];
  weather_code: number;
  condition: string;
  wind_speed_kmh: number;
  is_day: boolean;
  observed_at: string;
  local_time: string;
  working_hours: { start: string; end: string };
  within_working_hours: boolean;
  outdoor_meeting_suitable: boolean;
  suitability_reasons: string[];
};

export class PreferencesRequiredError extends Error {
  constructor() {
    super("Save a preferred city before requesting weather.");
    this.name = "PreferencesRequiredError";
  }
}

export async function buildWeatherReport(input: {
  preference: UserPreference;
  fetchImpl?: typeof fetch;
  now?: Date;
}): Promise<WeatherReport> {
  const place = await geocodeCity({
    city: input.preference.preferredCity,
    countryCode: input.preference.preferredCountry,
    fetchImpl: input.fetchImpl,
  });
  const timezone = input.preference.preferredTimezone || place.timezone || "UTC";
  const current = await fetchCurrentWeather({
    latitude: place.latitude,
    longitude: place.longitude,
    temperatureUnit: input.preference.temperatureUnit,
    timezone,
    fetchImpl: input.fetchImpl,
  });
  const suitability = assessOutdoorMeeting({
    weatherCode: current.weatherCode,
    temperature: current.temperature,
    temperatureUnit: input.preference.temperatureUnit,
    windSpeedKmh: current.windSpeedKmh,
    timezone,
    workingHoursStart: input.preference.workingHoursStart,
    workingHoursEnd: input.preference.workingHoursEnd,
    now: input.now,
  });

  return {
    city: input.preference.preferredCity,
    country: input.preference.preferredCountry,
    resolved_name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone,
    temperature: current.temperature,
    temperature_unit: input.preference.temperatureUnit,
    weather_code: current.weatherCode,
    condition: describeWeatherCode(current.weatherCode),
    wind_speed_kmh: current.windSpeedKmh,
    is_day: current.isDay,
    observed_at: current.observedAt,
    local_time: suitability.localTime,
    working_hours: {
      start: input.preference.workingHoursStart,
      end: input.preference.workingHoursEnd,
    },
    within_working_hours: suitability.withinWorkingHours,
    outdoor_meeting_suitable: suitability.suitable,
    suitability_reasons: suitability.reasons,
  };
}

export function weatherErrorStatus(error: WeatherProviderError): number {
  if (error.code === "not_found") return 404;
  if (error.code === "timeout") return 504;
  return 502;
}
