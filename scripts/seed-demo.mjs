// Creates or repairs the demo account, with premium granted directly (no Stripe).
//
//   DEMO_PASSWORD=... npm run db:seed-demo             creates it, safe to re-run
//   DEMO_PASSWORD=... npm run db:seed-demo -- --adopt  also takes over an existing
//                                                      account that uses this email
//
// The password comes from the environment so it never lands in the repository.
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const EMAIL = "demo@demo.com";
const NAME = "Demo User";
const BCRYPT_COST = 12; // same as lib/password.ts

const { DATABASE_URL, DEMO_PASSWORD } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
if (!DEMO_PASSWORD) {
  console.error("DEMO_PASSWORD is not set.");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
console.log(`Database host: ${new URL(DATABASE_URL).hostname}`);

try {
  const existing = await sql`
    SELECT u.id, s.comped
    FROM users u LEFT JOIN subscriptions s ON s.user_id = u.id
    WHERE u.email = ${EMAIL}
  `;
  const user = existing[0];

  // Someone else could have signed up with this email, so never take it over silently.
  if (user && !user.comped && !process.argv.includes("--adopt")) {
    console.error(`${EMAIL} already exists and is not the demo account. Nothing changed.`);
    console.error("Check who owns it, then re-run with --adopt if it is safe to take over.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const rows = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${NAME}, ${EMAIL}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id
  `;
  // A taken-over account must not stay logged in on its previous owner's devices.
  if (user && !user.comped) await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;
  await sql`
    INSERT INTO subscriptions (user_id, comped)
    VALUES (${rows[0].id}, true)
    ON CONFLICT (user_id) DO UPDATE SET comped = true, updated_at = now()
  `;
  console.log(`${user ? "Updated" : "Created"} ${EMAIL} with premium access.`);
} catch (error) {
  console.error("Could not set up the demo account:", error.message);
  process.exitCode = 1;
}
