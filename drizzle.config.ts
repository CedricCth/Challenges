import "dotenv/config";
import type { Config } from "drizzle-kit";

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
  strict: true,
  verbose: true,
} satisfies Config;
