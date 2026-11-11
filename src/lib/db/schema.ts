import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey(),
    auth0Subject: text("auth0_subject").notNull().unique(),
    preferredCity: text("preferred_city").notNull(),
    preferredCountry: text("preferred_country").notNull(),
    preferredTimezone: text("preferred_timezone").notNull(),
    workingHoursStart: text("working_hours_start").notNull(),
    workingHoursEnd: text("working_hours_end").notNull(),
    temperatureUnit: text("temperature_unit").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    check("user_preferences_temperature_unit_check", sql`${table.temperatureUnit} in ('celsius', 'fahrenheit')`),
    check(
      "user_preferences_hours_start_check",
      sql`${table.workingHoursStart} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    check(
      "user_preferences_hours_end_check",
      sql`${table.workingHoursEnd} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
  ],
);

export type UserPreferenceRow = typeof userPreferences.$inferSelect;
