export const TEMPERATURE_UNITS = ["celsius", "fahrenheit"] as const;

export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number];

export type UserPreference = {
  id: string;
  auth0Subject: string;
  preferredCity: string;
  preferredCountry: string;
  preferredTimezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  temperatureUnit: TemperatureUnit;
  createdAt: Date;
  updatedAt: Date;
};

export type PreferencePatch = Partial<{
  preferredCity: string;
  preferredCountry: string;
  preferredTimezone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  temperatureUnit: TemperatureUnit;
}>;

export type PublicPreference = {
  id: string;
  preferred_city: string;
  preferred_country: string;
  preferred_timezone: string;
  working_hours_start: string;
  working_hours_end: string;
  temperature_unit: TemperatureUnit;
  created_at: string;
  updated_at: string;
};

export function toPublicPreference(preference: UserPreference): PublicPreference {
  return {
    id: preference.id,
    preferred_city: preference.preferredCity,
    preferred_country: preference.preferredCountry,
    preferred_timezone: preference.preferredTimezone,
    working_hours_start: preference.workingHoursStart,
    working_hours_end: preference.workingHoursEnd,
    temperature_unit: preference.temperatureUnit,
    created_at: preference.createdAt.toISOString(),
    updated_at: preference.updatedAt.toISOString(),
  };
}
