import { createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { FREE_AI_DAILY, PREMIUM_AI_DAILY } from "@/lib/plans";

/**
 * Fixed-window counters stored in Postgres, so every Vercel instance shares
 * them. Each attempt is counted atomically before the work happens, which means
 * a burst of parallel requests cannot slip past the limit.
 */

export type Rule = { limit: number; windowSeconds: number };

export const LOGIN_EMAIL_IP: Rule = { limit: 5, windowSeconds: 15 * 60 };
export const LOGIN_IP: Rule = { limit: 30, windowSeconds: 15 * 60 };
export const SIGNUP_IP: Rule = { limit: 10, windowSeconds: 60 * 60 };
export const AI_DAILY_FREE: Rule = { limit: FREE_AI_DAILY, windowSeconds: 24 * 60 * 60 };
export const AI_DAILY_PREMIUM: Rule = { limit: PREMIUM_AI_DAILY, windowSeconds: 24 * 60 * 60 };
// Backstop for the whole site, since new accounts could otherwise multiply the per-user limit.
export const AI_GLOBAL: Rule = { limit: 200, windowSeconds: 24 * 60 * 60 };
export const BILLING_USER: Rule = { limit: 20, windowSeconds: 60 * 60 };

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export const loginEmailIpKey = (email: string, ip: string) =>
  `login:email-ip:${hash(`${email}|${ip}`)}`;
export const loginIpKey = (ip: string) => `login:ip:${hash(ip)}`;
export const signupIpKey = (ip: string) => `signup:ip:${hash(ip)}`;
export const aiUserKey = (userId: string) => `ai:user:${userId}`;
export const AI_GLOBAL_KEY = "ai:global";
export const billingUserKey = (userId: string) => `billing:user:${userId}`;

/** Counts one attempt. Returns how long to wait if the limit is exceeded. */
export async function consume(key: string, rule: Rule) {
  const seconds = rule.windowSeconds;
  const rows = await sql()`
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${seconds}::double precision)
        THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE
        WHEN rate_limits.window_start <= now() - make_interval(secs => ${seconds}::double precision)
        THEN now() ELSE rate_limits.window_start END
    RETURNING count,
      CEIL(EXTRACT(EPOCH FROM
        window_start + make_interval(secs => ${seconds}::double precision) - now()))::int AS retry_after
  `;
  const { count, retry_after: retryAfter } = rows[0] as { count: number; retry_after: number };

  // Occasional cleanup so expired counters don't pile up.
  if (Math.random() < 0.01) {
    await sql()`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`;
  }

  return { allowed: count <= rule.limit, retryAfter: Math.max(retryAfter, 1) };
}

/** Clears a counter, for example after a successful login. */
export async function reset(key: string) {
  await sql()`DELETE FROM rate_limits WHERE key = ${key}`;
}

/** Gives back one attempt, when the attempt shouldn't count against the user. */
export async function refund(key: string) {
  await sql()`UPDATE rate_limits SET count = GREATEST(count - 1, 0) WHERE key = ${key}`;
}
