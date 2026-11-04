import { NextResponse } from "next/server";
import { clientIp, jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  consume,
  LOGIN_EMAIL_IP,
  LOGIN_IP,
  loginEmailIpKey,
  loginIpKey,
  refund,
  reset,
} from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/validation";

export const POST = post(async (request) => {
  const body = await readBody(request);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";

  const ip = clientIp(request);
  const emailIpKey = loginEmailIpKey(email, ip);
  const ipKey = loginIpKey(ip);

  // Counted before the password check, so parallel guesses can't outrun the limit.
  const [byEmailIp, byIp] = await Promise.all([
    consume(emailIpKey, LOGIN_EMAIL_IP),
    consume(ipKey, LOGIN_IP),
  ]);
  if (!byEmailIp.allowed || !byIp.allowed) {
    const retryAfter = Math.max(
      byEmailIp.allowed ? 0 : byEmailIp.retryAfter,
      byIp.allowed ? 0 : byIp.retryAfter,
    );
    const minutes = Math.ceil(retryAfter / 60);
    return jsonError(
      `Too many login attempts. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      { "Retry-After": String(retryAfter) },
    );
  }

  const rows = await sql()`SELECT id, password_hash FROM users WHERE email = ${email}`;
  const user = rows[0];

  // Same message and same work whether the email or the password was wrong.
  const valid = await verifyPassword(password, user?.password_hash as string | undefined);
  if (!user || !valid) return jsonError("Incorrect email or password.", 401);

  // A successful login doesn't count against this person or their network.
  await Promise.all([reset(emailIpKey), refund(ipKey)]);

  await createSession(user.id as string);
  return NextResponse.json({ ok: true });
});
