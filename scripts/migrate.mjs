// Creates the database tables. Usage: npm run db:migrate
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const statements = schema.split(/;\s*$/m).filter((s) => s.replace(/--.*$/gm, "").trim());

try {
  for (const statement of statements) await sql.query(statement);
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  console.log("Migration complete. Tables:", rows.map((r) => r.table_name).join(", "));
} catch (error) {
  console.error("Migration failed:", error.message);
  process.exitCode = 1;
}
