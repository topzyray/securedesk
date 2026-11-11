import { getDb } from "@/lib/db";
import { createPreferenceRepository, type PreferenceRepository } from "@/lib/preferences/repository";
import type { UserPreference } from "@/lib/preferences/types";
import { mergePreferences, parsePreferencePatch } from "@/lib/preferences/validation";

export async function readPreferences(
  subject: string,
  repository: PreferenceRepository = createPreferenceRepository(getDb()),
): Promise<UserPreference | null> {
  return repository.findBySubject(subject);
}

export async function updatePreferences(
  subject: string,
  input: unknown,
  repository: PreferenceRepository = createPreferenceRepository(getDb()),
): Promise<UserPreference> {
  const patch = parsePreferencePatch(input);
  const existing = await repository.findBySubject(subject);
  const merged = mergePreferences(existing, patch);
  return repository.save(subject, merged);
}
