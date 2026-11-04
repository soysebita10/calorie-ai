import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

const COOKIE_NAME = "calorieai_session";
const SESSION_DAYS = 30;

export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string | Date;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Starts a session in the database and sets the login cookie. */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  await sql()`DELETE FROM sessions WHERE user_id = ${userId} AND expires_at <= now()`;
  await sql()`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/** Ends the session on the server, so the old cookie stops working everywhere. */
export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await sql()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  store.delete(COOKIE_NAME);
}

/** The logged-in user, or null. The only source of user identity in the app. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  const rows = await sql()`
    SELECT u.id, u.name, u.email, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now()
  `;
  return (rows[0] as User | undefined) ?? null;
});

/** For protected pages: sends logged-out visitors to the login page. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For the login and signup pages: logged-in users go straight to the dashboard. */
export async function redirectIfLoggedIn() {
  if (await getCurrentUser()) redirect("/dashboard");
}
