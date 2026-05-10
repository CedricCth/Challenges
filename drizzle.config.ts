import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

// Match Next.js's env loading order: .env.local overrides .env.
loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  throw new Error(
    "SUPABASE_DB_URL is not set. Copy .env.example to .env.local and fill in your Supabase Postgres connection string.",
  );
}

export default {
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  // We declare auth.users in schema.ts only for FK type-safety; Supabase
  // owns that table, so don't include it in migrations.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
} satisfies Config;
