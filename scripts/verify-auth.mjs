// End-to-end auth test against a running app.
//
//   npm run verify:auth                                  (http://localhost:3000)
//   BASE_URL=https://your-app.vercel.app npm run verify:auth
//
// Creates two throwaway accounts on @example.com. With DATABASE_URL set it also
// inspects the stored rows and deletes the test accounts afterwards.
import { neon } from "@neondatabase/serverless";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

const stamp = Date.now();
const startedAt = new Date(stamp - 60_000).toISOString();
const PASSWORD_A = `Alpha-${stamp}-pass`;
const PASSWORD_B = `Bravo-${stamp}-pass`;
const EMAIL_A = `verify-a-${stamp}@example.com`;
const EMAIL_B = `verify-b-${stamp}@example.com`;

let failures = 0;
function check(label, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}${!passed && detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

function send(path, { cookie, body, origin = BASE, method = body ? "POST" : "GET" } = {}) {
  return fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: {
      ...(method === "POST" && origin ? { Origin: origin } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function sessionCookie(response) {
  return response.headers.getSetCookie().find((c) => c.startsWith("calorieai_session=")) ?? "";
}
const cookiePair = (setCookie) => setCookie.split(";")[0];
const redirectsTo = (response, path) =>
  response.status >= 300 && response.status < 400 &&
  new URL(response.headers.get("location"), BASE).pathname === path;

async function run() {
  console.log(`Testing ${BASE}\n`);

  console.log("Homepage");
  const home = await send("/");
  const homeHtml = await home.text();
  check("homepage loads", home.status === 200, `status ${home.status}`);
  check("homepage displays Sebastian Nieves", homeHtml.includes("Sebastian Nieves"));
  check("homepage links to signup and login", homeHtml.includes('href="/signup"') && homeHtml.includes('href="/login"'));

  console.log("\nProtected dashboard");
  check("logged-out visitor is redirected to /login", redirectsTo(await send("/dashboard"), "/login"));
  check("made-up cookie is redirected to /login", redirectsTo(await send("/dashboard", { cookie: "calorieai_session=forged" }), "/login"));

  console.log("\nSignup");
  const shortPw = await send("/api/auth/signup", { body: { name: "A", email: EMAIL_A, password: "short" } });
  check("short password rejected", shortPw.status === 400, `status ${shortPw.status}`);
  const badEmail = await send("/api/auth/signup", { body: { name: "A", email: "nope", password: PASSWORD_A } });
  check("invalid email rejected", badEmail.status === 400, `status ${badEmail.status}`);
  const crossSite = await send("/api/auth/signup", {
    origin: "https://evil.example",
    body: { name: "A", email: EMAIL_A, password: PASSWORD_A },
  });
  check("cross-site POST blocked", crossSite.status === 403, `status ${crossSite.status}`);

  const signupA = await send("/api/auth/signup", { body: { name: "Tester Alpha", email: EMAIL_A, password: PASSWORD_A } });
  const setCookieA = sessionCookie(signupA);
  check("signup succeeds", signupA.status === 201, `status ${signupA.status}: ${await signupA.clone().text()}`);
  check("cookie is HttpOnly", /;\s*httponly/i.test(setCookieA));
  check("cookie is SameSite=Lax", /;\s*samesite=lax/i.test(setCookieA));
  check("cookie persists for 30 days", /;\s*max-age=2592000/i.test(setCookieA), setCookieA.replace(/=[^;]+/, "=..."));
  if (BASE.startsWith("https://")) check("cookie is Secure", /;\s*secure/i.test(setCookieA));

  const duplicate = await send("/api/auth/signup", { body: { name: "Copy", email: EMAIL_A.toUpperCase(), password: PASSWORD_A } });
  check("duplicate email rejected (case-insensitive)", duplicate.status === 409, `status ${duplicate.status}`);

  if (sql) {
    console.log("\nStored data");
    const [row] = await sql`SELECT password_hash FROM users WHERE email = ${EMAIL_A}`;
    check("user row exists in the database", Boolean(row));
    check("password stored as a bcrypt hash", /^\$2[aby]\$12\$/.test(row?.password_hash ?? ""));
    check("plaintext password is not stored", !row?.password_hash.includes(PASSWORD_A));
    const token = cookiePair(setCookieA).split("=")[1];
    const raw = await sql`SELECT 1 FROM sessions WHERE token_hash = ${token}`;
    const stored = await sql`SELECT s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = ${EMAIL_A}`;
    check("session stored in the database", stored.length === 1);
    check("raw session token is not stored", raw.length === 0);
  }

  console.log("\nLogged-in session");
  const cookieA = cookiePair(setCookieA);
  const dashA = await send("/dashboard", { cookie: cookieA });
  const dashAHtml = await dashA.text();
  check("dashboard opens with the session cookie", dashA.status === 200, `status ${dashA.status}`);
  check("dashboard shows this user's email", dashAHtml.includes(EMAIL_A));
  check("password hash never reaches the page", !dashAHtml.includes("$2b$") && !dashAHtml.includes("$2a$"));
  check("/login redirects logged-in users to /dashboard", redirectsTo(await send("/login", { cookie: cookieA }), "/dashboard"));

  console.log("\nLogout");
  const logout = await send("/api/auth/logout", { cookie: cookieA, method: "POST" });
  check("logout redirects to homepage", redirectsTo(logout, "/"));
  check("logout clears the cookie", /calorieai_session=;|calorieai_session=""|max-age=0|expires=thu, 01 jan 1970/i.test(sessionCookie(logout)));
  check("old cookie no longer works (revoked on the server)", redirectsTo(await send("/dashboard", { cookie: cookieA }), "/login"));

  console.log("\nLogin");
  const wrongPw = await send("/api/auth/login", { body: { email: EMAIL_A, password: "wrong-password" } });
  const wrongPwBody = await wrongPw.text();
  check("wrong password rejected", wrongPw.status === 401, `status ${wrongPw.status}`);
  const unknown = await send("/api/auth/login", { body: { email: `nobody-${stamp}@example.com`, password: PASSWORD_A } });
  check("unknown email rejected", unknown.status === 401, `status ${unknown.status}`);
  check("both failures give the same message", wrongPwBody === (await unknown.text()));
  check("failed login sets no cookie", !sessionCookie(wrongPw));
  const loginA = await send("/api/auth/login", { body: { email: EMAIL_A.toUpperCase(), password: PASSWORD_A } });
  check("correct password logs in (email case ignored)", loginA.status === 200, `status ${loginA.status}`);
  const cookieA2 = cookiePair(sessionCookie(loginA));
  check("new login gets a new session token", Boolean(cookieA2) && cookieA2 !== cookieA);

  console.log("\nLogin rate limiting");
  const limited = `verify-limit-${stamp}@example.com`;
  const signupLimited = await send("/api/auth/signup", { body: { name: "Tester Limit", email: limited, password: PASSWORD_A } });
  check("rate-limit test account created", signupLimited.status === 201, `status ${signupLimited.status}`);
  const statuses = [];
  for (let i = 0; i < 5; i += 1) {
    statuses.push((await send("/api/auth/login", { body: { email: limited, password: "wrong-password" } })).status);
  }
  check("first 5 wrong passwords answer 401", statuses.every((s) => s === 401), statuses.join(","));
  const blocked = await send("/api/auth/login", { body: { email: limited, password: PASSWORD_A } });
  check("6th attempt is blocked, even with the correct password", blocked.status === 429, `status ${blocked.status}`);
  const retryAfter = Number(blocked.headers.get("retry-after"));
  check("blocked response says when to retry", retryAfter > 0 && retryAfter <= 900, `retry-after ${retryAfter}`);
  check("blocked login sets no cookie", !sessionCookie(blocked));

  const stillOk = await send("/api/auth/login", { body: { email: EMAIL_A, password: PASSWORD_A } });
  check("other accounts on the same network can still log in", stillOk.status === 200, `status ${stillOk.status}`);

  const burst = `verify-burst-${stamp}@example.com`;
  const parallel = await Promise.all(
    Array.from({ length: 12 }, () => send("/api/auth/login", { body: { email: burst, password: "wrong-password" } })),
  );
  const burstStatuses = parallel.map((r) => r.status);
  check(
    "12 parallel guesses: only 5 reach the password check",
    burstStatuses.filter((s) => s === 401).length === 5 && burstStatuses.filter((s) => s === 429).length === 7,
    burstStatuses.join(","),
  );

  if (BASE.startsWith("https://")) {
    const spoofed = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      redirect: "manual",
      headers: {
        Origin: BASE,
        "Content-Type": "application/json",
        "X-Forwarded-For": "203.0.113.77",
        "X-Vercel-Forwarded-For": "203.0.113.77",
      },
      body: JSON.stringify({ email: limited, password: "wrong-password" }),
    });
    check("faking the IP header doesn't get around the limit", spoofed.status === 429, `status ${spoofed.status}`);
  }

  console.log("\nPer-user data isolation");
  const signupB = await send("/api/auth/signup", { body: { name: "Tester Bravo", email: EMAIL_B, password: PASSWORD_B } });
  check("second account created", signupB.status === 201, `status ${signupB.status}`);
  const cookieB = cookiePair(sessionCookie(signupB));

  check("goal rejected without login", (await send("/api/goal", { body: { dailyCalories: 2000 } })).status === 401);
  check("out-of-range goal rejected", (await send("/api/goal", { cookie: cookieA2, body: { dailyCalories: 5 } })).status === 400);
  check("user A saves a goal", (await send("/api/goal", { cookie: cookieA2, body: { dailyCalories: 2111 } })).status === 200);

  const [rowA] = sql ? await sql`SELECT id FROM users WHERE email = ${EMAIL_A}` : [{ id: "1" }];
  check(
    "user B saves a goal, trying to target user A's id",
    (await send("/api/goal", { cookie: cookieB, body: { dailyCalories: 3222, userId: rowA.id, user_id: rowA.id } })).status === 200,
  );

  const viewA = await (await send("/dashboard", { cookie: cookieA2 })).text();
  const viewB = await (await send("/dashboard", { cookie: cookieB })).text();
  check("A sees A's goal", viewA.includes('value="2111"'));
  check("A's goal was not overwritten by B", !viewA.includes('value="3222"'));
  check("B sees B's goal", viewB.includes('value="3222"'));
  check("A's page has no trace of B", !viewA.includes(EMAIL_B) && !viewA.includes("Tester Bravo"));
  check("B's page has no trace of A", !viewB.includes(EMAIL_A) && !viewB.includes("Tester Alpha"));

  if (sql) {
    // Clears the login counters this run created, so re-running doesn't lock out this network.
    await sql`DELETE FROM rate_limits WHERE key LIKE 'login:%' AND window_start >= ${startedAt}`;
    await sql`DELETE FROM users WHERE email IN (${EMAIL_A}, ${EMAIL_B}, ${`verify-limit-${stamp}@example.com`})`;
    const left = await sql`SELECT count(*)::int AS n FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL`;
    check("deleting users removes their sessions", left[0].n === 0);
    console.log("\nTest accounts deleted.");
  } else {
    console.log(`\nDATABASE_URL not set: database checks skipped, and test accounts were left behind.`);
    console.log("This run also used up login attempts for your network for 15 minutes.");
  }

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

run().catch((error) => {
  console.error("\nCould not finish the test:", error.message);
  console.error(`Is the app running at ${BASE}?`);
  process.exitCode = 1;
});
