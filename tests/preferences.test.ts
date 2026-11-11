import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { describe, expect, it } from "vitest";
import type { AppDatabase } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { createPreferenceRepository } from "@/lib/preferences/repository";
import { updatePreferences } from "@/lib/preferences/service";

const migration = readFileSync(new URL("../drizzle/0000_user_preferences.sql", import.meta.url), "utf8");

async function createTestRepository() {
  const client = new PGlite();
  await client.exec(migration);
  const db = drizzle(client, { schema });
  return createPreferenceRepository(db);
}

const ada = {
  preferred_city: "Lagos",
  preferred_country: "NG",
  preferred_timezone: "Africa/Lagos",
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  temperature_unit: "celsius" as const,
};

const grace = {
  preferred_city: "Nairobi",
  preferred_country: "KE",
  preferred_timezone: "Africa/Nairobi",
  working_hours_start: "08:00",
  working_hours_end: "16:00",
  temperature_unit: "fahrenheit" as const,
};

describe("preference storage", () => {
  it("saves and reads preferences for one subject", async () => {
    const repository = await createTestRepository();
    const saved = await updatePreferences("auth0|ada", ada, repository);
    const loaded = await repository.findBySubject("auth0|ada");

    expect(saved.preferredCity).toBe("Lagos");
    expect(loaded?.auth0Subject).toBe("auth0|ada");
    expect(loaded?.temperatureUnit).toBe("celsius");
  });

  it("updates the same subject and leaves the other user unchanged", async () => {
    const repository = await createTestRepository();
    await updatePreferences("auth0|ada", ada, repository);
    await updatePreferences("auth0|grace", grace, repository);

    const updated = await updatePreferences(
      "auth0|ada",
      { preferred_city: "Abuja", preferred_country: "ng" },
      repository,
    );
    const graceRow = await repository.findBySubject("auth0|grace");

    expect(updated.preferredCity).toBe("Abuja");
    expect(updated.preferredCountry).toBe("NG");
    expect(updated.preferredTimezone).toBe("Africa/Lagos");
    expect(graceRow?.preferredCity).toBe("Nairobi");
    expect(graceRow?.auth0Subject).toBe("auth0|grace");
  });

  it("rejects a browser-supplied subject and invalid fields", async () => {
    const repository = await createTestRepository();
    await expect(
      updatePreferences("auth0|ada", { ...ada, auth0_subject: "auth0|grace" }, repository),
    ).rejects.toThrow(/unrecognized/i);
    await expect(updatePreferences("auth0|ada", { ...ada, preferred_timezone: "Not/AZone" }, repository)).rejects.toThrow(
      /timezone/i,
    );
    await expect(
      updatePreferences("auth0|ada", { ...ada, working_hours_start: "09:00", working_hours_end: "09:00" }, repository),
    ).rejects.toThrow(/range/i);
  });
});
