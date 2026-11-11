import { z } from "zod";

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});

const forecastSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    is_day: z.number().optional(),
  }),
});

export class WeatherProviderError extends Error {
  constructor(
    public readonly code: "timeout" | "upstream" | "not_found" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "WeatherProviderError";
  }
}

export type GeocodedPlace = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
  timezone?: string;
};

export type CurrentConditions = {
  observedAt: string;
  temperature: number;
  weatherCode: number;
  windSpeedKmh: number;
  isDay: boolean;
};

type FetchLike = typeof fetch;

const DEFAULT_TIMEOUT_MS = 8000;

function timeoutMs(): number {
  const configured = Number(process.env.OPEN_METEO_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(configured) || configured < 1000) return DEFAULT_TIMEOUT_MS;
  return configured;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function requestJson(url: URL, fetchImpl: FetchLike, timeout: number): Promise<unknown> {
  try {
    const response = await fetchImpl(url, {
      headers: { accept: "application/json", "user-agent": "SecureDesk/1.0" },
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new WeatherProviderError("upstream", "The weather service returned an error.");
    }
    return await response.json();
  } catch (error) {
    if (error instanceof WeatherProviderError) throw error;
    if (isTimeout(error)) {
      throw new WeatherProviderError("timeout", "The weather service timed out.");
    }
    throw new WeatherProviderError("upstream", "The weather service is unavailable.");
  }
}

export async function geocodeCity(input: {
  city: string;
  countryCode?: string;
  fetchImpl?: FetchLike;
  timeout?: number;
}): Promise<GeocodedPlace> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const timeout = input.timeout ?? timeoutMs();

  const search = async (countryCode?: string) => {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", input.city);
    url.searchParams.set("count", "5");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    if (countryCode) url.searchParams.set("countryCode", countryCode);
    const payload = geocodingSchema.safeParse(await requestJson(url, fetchImpl, timeout));
    if (!payload.success) {
      throw new WeatherProviderError("invalid", "The geocoding response was not usable.");
    }
    return payload.data.results ?? [];
  };

  let results = await search(input.countryCode);
  if (results.length === 0 && input.countryCode) {
    results = await search(undefined);
  }

  const place = results[0];
  if (!place) {
    throw new WeatherProviderError("not_found", "No coordinates were found for the preferred city.");
  }

  return {
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    country: place.country,
    countryCode: place.country_code,
    timezone: place.timezone,
  };
}

export async function fetchCurrentWeather(input: {
  latitude: number;
  longitude: number;
  temperatureUnit: "celsius" | "fahrenheit";
  timezone: string;
  fetchImpl?: FetchLike;
  timeout?: number;
}): Promise<CurrentConditions> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(input.latitude));
  url.searchParams.set("longitude", String(input.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m,is_day");
  url.searchParams.set("temperature_unit", input.temperatureUnit);
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", input.timezone);

  const payload = forecastSchema.safeParse(
    await requestJson(url, input.fetchImpl ?? fetch, input.timeout ?? timeoutMs()),
  );
  if (!payload.success) {
    throw new WeatherProviderError("invalid", "The forecast response was not usable.");
  }

  return {
    observedAt: payload.data.current.time,
    temperature: payload.data.current.temperature_2m,
    weatherCode: payload.data.current.weather_code,
    windSpeedKmh: payload.data.current.wind_speed_10m,
    isDay: payload.data.current.is_day !== 0,
  };
}
