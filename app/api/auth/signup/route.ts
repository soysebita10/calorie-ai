import { NextResponse } from "next/server";
import { clientIp, jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { consume, SIGNUP_IP, signupIpKey } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import {
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/validation";

export const POST = post(async (request) => {
  const body = await readBody(request);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  const invalid = validateName(name) ?? validateEmail(email) ?? validatePassword(password);
  if (invalid) return jsonError(invalid, 400);

  // Counted before the slow password hash, so parallel requests can't outrun the limit.
  const limit = await consume(signupIpKey(clientIp(request)), SIGNUP_IP);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfter / 60);
    return jsonError(
      `Too many new accounts from this network. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql()`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email}, ${passwordHash})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
  `;
  if (rows.length === 0) {
    return jsonError("An account with this email already exists.", 409);
  }

  await createSession(rows[0].id as string);
  return NextResponse.json({ ok: true }, { status: 201 });
});
