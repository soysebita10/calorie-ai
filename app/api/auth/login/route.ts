import { NextResponse } from "next/server";
import { jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/validation";

export const POST = post(async (request) => {
  const body = await readBody(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  const rows = await sql()`SELECT id, password_hash FROM users WHERE email = ${email}`;
  const user = rows[0];

  // Same message and same work whether the email or the password was wrong.
  const valid = await verifyPassword(password, user?.password_hash as string | undefined);
  if (!user || !valid) return jsonError("Incorrect email or password.", 401);

  await createSession(user.id as string);
  return NextResponse.json({ ok: true });
});
