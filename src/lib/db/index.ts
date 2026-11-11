import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

let database: AppDatabase | null = null;
let client: ReturnType<typeof postgres> | null = null;
let connectedUrl: string | null = null;

export function getDb(): AppDatabase {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (database && connectedUrl === url) return database;

  if (client) {
    void client.end({ timeout: 1 }).catch(() => undefined);
  }

  client = postgres(url, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  database = drizzle(client, { schema });
  connectedUrl = url;
  return database;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
  }
  client = null;
  database = null;
  connectedUrl = null;
}
