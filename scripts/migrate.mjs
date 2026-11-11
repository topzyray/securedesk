import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const migration = readFileSync(new URL("../drizzle/0000_user_preferences.sql", import.meta.url), "utf8");

await sql.unsafe(migration);
await sql.end();
console.log("Applied drizzle/0000_user_preferences.sql");
