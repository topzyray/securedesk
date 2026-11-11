import { z } from "zod";
import { TEMPERATURE_UNITS, type PreferencePatch, type UserPreference } from "@/lib/preferences/types";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM.");

const citySchema = z
  .string()
  .trim()
  .min(1, "City is required.")
  .max(80, "City must be 80 characters or fewer.")
  .regex(/^[\p{L}\p{M}\s.'-]+$/u, "City contains unsupported characters.");

const countrySchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, "Country must be an ISO 3166-1 alpha-2 code.")
  .transform((value) => value.toUpperCase());

const timezoneSchema = z.string().trim().refine((value) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Timezone must be an IANA timezone name.");

export const preferencePatchSchema = z
  .object({
    preferred_city: citySchema.optional(),
    preferred_country: countrySchema.optional(),
    preferred_timezone: timezoneSchema.optional(),
    working_hours_start: timeSchema.optional(),
    working_hours_end: timeSchema.optional(),
    temperature_unit: z.enum(TEMPERATURE_UNITS).optional(),
  })
  .strict();

export type PreferencePatchInput = z.infer<typeof preferencePatchSchema>;

export class PreferenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PreferenceValidationError";
  }
}

export function parsePreferencePatch(input: unknown): PreferencePatchInput {
  const parsed = preferencePatchSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Preferences are invalid.";
    throw new PreferenceValidationError(message);
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new PreferenceValidationError("Provide at least one preference to update.");
  }
  return parsed.data;
}

export function mergePreferences(
  existing: UserPreference | null,
  patch: PreferencePatchInput,
): Omit<UserPreference, "id" | "auth0Subject" | "createdAt" | "updatedAt"> {
  const merged = {
    preferredCity: patch.preferred_city ?? existing?.preferredCity,
    preferredCountry: patch.preferred_country ?? existing?.preferredCountry,
    preferredTimezone: patch.preferred_timezone ?? existing?.preferredTimezone,
    workingHoursStart: patch.working_hours_start ?? existing?.workingHoursStart,
    workingHoursEnd: patch.working_hours_end ?? existing?.workingHoursEnd,
    temperatureUnit: patch.temperature_unit ?? existing?.temperatureUnit,
  };

  if (
    !merged.preferredCity ||
    !merged.preferredCountry ||
    !merged.preferredTimezone ||
    !merged.workingHoursStart ||
    !merged.workingHoursEnd ||
    !merged.temperatureUnit
  ) {
    throw new PreferenceValidationError(
      "City, country, timezone, working hours, and temperature unit are required.",
    );
  }

  if (merged.workingHoursStart === merged.workingHoursEnd) {
    throw new PreferenceValidationError("Working hours must cover a range.");
  }

  return {
    preferredCity: merged.preferredCity,
    preferredCountry: merged.preferredCountry,
    preferredTimezone: merged.preferredTimezone,
    workingHoursStart: merged.workingHoursStart,
    workingHoursEnd: merged.workingHoursEnd,
    temperatureUnit: merged.temperatureUnit,
  };
}

export function toPreferencePatch(input: PreferencePatchInput): PreferencePatch {
  return {
    preferredCity: input.preferred_city,
    preferredCountry: input.preferred_country,
    preferredTimezone: input.preferred_timezone,
    workingHoursStart: input.working_hours_start,
    workingHoursEnd: input.working_hours_end,
    temperatureUnit: input.temperature_unit,
  };
}
