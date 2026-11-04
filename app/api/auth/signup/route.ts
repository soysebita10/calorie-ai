import { NextResponse } from "next/server";
import { jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/password";
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
