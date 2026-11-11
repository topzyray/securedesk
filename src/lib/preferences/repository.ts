import { eq } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import type { TemperatureUnit, UserPreference } from "@/lib/preferences/types";

export type PreferenceWrite = Omit<UserPreference, "id" | "auth0Subject" | "createdAt" | "updatedAt">;

type PreferenceQuery = Pick<AppDatabase, "insert" | "select">;

function mapRow(row: typeof userPreferences.$inferSelect): UserPreference {
  return {
    id: row.id,
    auth0Subject: row.auth0Subject,
    preferredCity: row.preferredCity,
    preferredCountry: row.preferredCountry,
    preferredTimezone: row.preferredTimezone,
    workingHoursStart: row.workingHoursStart,
    workingHoursEnd: row.workingHoursEnd,
    temperatureUnit: row.temperatureUnit as TemperatureUnit,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createPreferenceRepository(db: PreferenceQuery) {
  return {
    async findBySubject(subject: string): Promise<UserPreference | null> {
      const rows = await db.select().from(userPreferences).where(eq(userPreferences.auth0Subject, subject)).limit(1);
      const row = rows[0];
      return row ? mapRow(row) : null;
    },

    async save(subject: string, values: PreferenceWrite): Promise<UserPreference> {
      const now = new Date();
      const rows = await db
        .insert(userPreferences)
        .values({
          id: crypto.randomUUID(),
          auth0Subject: subject,
          preferredCity: values.preferredCity,
          preferredCountry: values.preferredCountry,
          preferredTimezone: values.preferredTimezone,
          workingHoursStart: values.workingHoursStart,
          workingHoursEnd: values.workingHoursEnd,
          temperatureUnit: values.temperatureUnit,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userPreferences.auth0Subject,
          set: {
            preferredCity: values.preferredCity,
            preferredCountry: values.preferredCountry,
            preferredTimezone: values.preferredTimezone,
            workingHoursStart: values.workingHoursStart,
            workingHoursEnd: values.workingHoursEnd,
            temperatureUnit: values.temperatureUnit,
            updatedAt: now,
          },
        })
        .returning();

      const row = rows[0];
      if (!row) {
        throw new Error("Preference save did not return a row.");
      }
      return mapRow(row);
    },
  };
}

export type PreferenceRepository = ReturnType<typeof createPreferenceRepository>;
