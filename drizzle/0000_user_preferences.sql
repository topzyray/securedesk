CREATE TABLE "user_preferences" (
  "id" uuid PRIMARY KEY NOT NULL,
  "auth0_subject" text NOT NULL UNIQUE,
  "preferred_city" text NOT NULL,
  "preferred_country" text NOT NULL,
  "preferred_timezone" text NOT NULL,
  "working_hours_start" text NOT NULL,
  "working_hours_end" text NOT NULL,
  "temperature_unit" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_temperature_unit_check" CHECK ("temperature_unit" in ('celsius', 'fahrenheit')),
  CONSTRAINT "user_preferences_hours_start_check" CHECK ("working_hours_start" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT "user_preferences_hours_end_check" CHECK ("working_hours_end" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);
