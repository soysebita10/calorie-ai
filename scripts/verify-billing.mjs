// End-to-end test of plans, limits and billing protection. Makes no AI calls and
// no Stripe calls, so it costs nothing.
//
//   npm run verify:billing
//
// It rewrites shared counters to simulate limits being reached, so it refuses to
// run unless ALLOW_LIMIT_TESTS=1 is set. Only use it against a test database.
import { neon } from "@neondatabase/serverless";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required: this test creates and deletes its own accounts.");
  process.exit(1);
}
if (process.env.ALLOW_LIMIT_TESTS !== "1") {
  console.error("Set ALLOW_LIMIT_TESTS=1 to confirm this is a test database, not the live one.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
console.log(`Database host: ${new URL(process.env.DATABASE_URL).hostname}`);

const stamp = Date.now();
const PASSWORD = `Billing-${stamp}-pass`;
const SIGNUP_LIMIT = 10;
const emails = [];

let failures = 0;
function check(label, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"}  ${label}${!passed && detail ? ` (${detail})` : ""}`);
  if (!passed) failures += 1;
}

function send(path, { cookie, json, form, origin = BASE, headers = {}, body } = {}) {
  return fetch(BASE + path, {
    method: json || form || body !== undefined || origin !== BASE ? "POST" : "GET",
    redirect: "manual",
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : (form ?? body),
  });
}

async function signup(label) {
  const email = `verify-billing-${label}-${stamp}@example.com`;
  emails.push(email);
  const response = await send("/api/auth/signup", { json: { name: "Tester", email, password: PASSWORD } });
  const set = response.headers.getSetCookie().find((c) => c.startsWith("calorieai_session="));
  return { email, response, cookie: set?.split(";")[0] };
}

const describeMeal = () => {
  const form = new FormData();
  form.set("description", "A bowl of oatmeal");
  return form;
};

// Pretends a counter is already at this value. Reaching a limit never calls the AI.
async function setCounter(key, count) {
  await sql`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, ${count}, now())
    ON CONFLICT (key) DO UPDATE SET count = ${count}, window_start = now()
  `;
}

const clearCounters = () =>
  sql`DELETE FROM rate_limits WHERE key = 'ai:global' OR key LIKE 'signup:ip:%'`;

async function cleanup() {
  await clearCounters();
  if (emails.length) await sql`DELETE FROM users WHERE email = ANY(${emails})`;
}

async function run() {
  console.log(`Testing ${BASE}\n`);
  await clearCounters();

  console.log("Signup rate limiting");
  const invalid = await send("/api/auth/signup", { json: { name: "A", email: "nope", password: PASSWORD } });
  check("invalid signup is still rejected as invalid", invalid.status === 400, `status ${invalid.status}`);
  const first = await signup("0");
  check("signup works under the limit", first.response.status === 201, `status ${first.response.status}`);
  const [counter] = await sql`SELECT count FROM rate_limits WHERE key LIKE 'signup:ip:%'`;
  check("invalid signups don't use up the limit", counter?.count === 1, `count ${counter?.count}`);
  for (let i = 1; i < SIGNUP_LIMIT; i += 1) await signup(String(i));
  const blocked = await signup("blocked");
  check(`signup ${SIGNUP_LIMIT + 1} from one IP is blocked`, blocked.response.status === 429, `status ${blocked.response.status}`);
  check("blocked signup says when to retry", Number(blocked.response.headers.get("retry-after")) > 0);
  check("blocked signup sets no cookie", !blocked.cookie);
  const [made] = await sql`SELECT count(*)::int AS n FROM users WHERE email = ${blocked.email}`;
  check("blocked signup creates no account", made.n === 0);
  await clearCounters();

  console.log("\nPlans");
  const a = await signup("plan");
  const [row] = await sql`SELECT id FROM users WHERE email = ${a.email}`;
  const aiKey = `ai:user:${row.id}`;
  const dashboard = await (await send("/dashboard", { cookie: a.cookie })).text();
  check("a new account is on the Free plan", /Your plan: (<!-- -->)?Free/.test(dashboard));
  check("Free shows an upgrade button", dashboard.includes("Upgrade to Premium"));

  await setCounter(aiKey, 3);
  const freeBlocked = await send("/api/meals/analyze", { cookie: a.cookie, form: describeMeal() });
  const freeBody = await freeBlocked.json();
  check("Free is blocked after 3 analyses", freeBlocked.status === 429 && freeBody.error.includes("3"), `status ${freeBlocked.status}`);

  await sql`INSERT INTO subscriptions (user_id, comped) VALUES (${row.id}, true)`;
  const premiumPage = await (await send("/dashboard", { cookie: a.cookie })).text();
  check("granted premium shows on the dashboard", /Your plan: (<!-- -->)?Premium/.test(premiumPage));
  check("granted premium shows no upgrade or manage button",
    !premiumPage.includes("Upgrade to Premium") && !premiumPage.includes("Manage subscription"));
  await setCounter(aiKey, 20);
  const premiumBlocked = await send("/api/meals/analyze", { cookie: a.cookie, form: describeMeal() });
  const premiumBody = await premiumBlocked.json();
  check("Premium is blocked after 20 analyses", premiumBlocked.status === 429 && premiumBody.error.includes("20"), `status ${premiumBlocked.status}`);

  for (const status of ["canceled", "past_due"]) {
    await sql`UPDATE subscriptions SET comped = false, status = ${status} WHERE user_id = ${row.id}`;
    const page = await (await send("/dashboard", { cookie: a.cookie })).text();
    check(`a ${status} subscription is not Premium`, /Your plan: (<!-- -->)?Free/.test(page));
  }
  await sql`UPDATE subscriptions SET status = 'active' WHERE user_id = ${row.id}`;
  const activePage = await (await send("/dashboard", { cookie: a.cookie })).text();
  check("an active subscription is Premium", /Your plan: (<!-- -->)?Premium/.test(activePage));

  console.log("\nSite-wide AI cap");
  const b = await signup("cap");
  await setCounter("ai:global", 200);
  const capped = await send("/api/meals/analyze", { cookie: b.cookie, form: describeMeal() });
  check("analyses stop at the site-wide cap", capped.status === 503, `status ${capped.status}`);
  const [bRow] = await sql`SELECT id FROM users WHERE email = ${b.email}`;
  const [bCount] = await sql`SELECT count FROM rate_limits WHERE key = ${`ai:user:${bRow.id}`}`;
  check("the cap doesn't use up the user's own allowance", bCount?.count === 0, `count ${bCount?.count}`);
  await clearCounters();

  console.log("\nBilling protection");
  const anonCheckout = await send("/api/billing/checkout", { form: new FormData() });
  check("logged-out checkout goes to /login", new URL(anonCheckout.headers.get("location") ?? "/", BASE).pathname === "/login");
  const crossCheckout = await send("/api/billing/checkout", { cookie: a.cookie, origin: "https://evil.example" });
  check("cross-site checkout is blocked", crossCheckout.status === 403, `status ${crossCheckout.status}`);
  const crossPortal = await send("/api/billing/portal", { cookie: a.cookie, origin: "https://evil.example" });
  check("cross-site portal is blocked", crossPortal.status === 403, `status ${crossPortal.status}`);
  const anonReturn = await send("/api/billing/return?session_id=cs_test_fake");
  check("logged-out return goes to /login", new URL(anonReturn.headers.get("location") ?? "/", BASE).pathname === "/login");

  const noSignature = await send("/api/stripe/webhook", { origin: null, body: "{}" });
  check("webhook without a signature is rejected", noSignature.status === 400, `status ${noSignature.status}`);
  const badSignature = await send("/api/stripe/webhook", {
    origin: null,
    body: JSON.stringify({ type: "customer.subscription.updated" }),
    headers: { "Stripe-Signature": `t=${Math.floor(stamp / 1000)},v1=${"0".repeat(64)}` },
  });
  check("webhook with a forged signature is rejected", badSignature.status === 400, `status ${badSignature.status}`);

  console.log("\nCleanup");
  await cleanup();
  const [left] = await sql`SELECT count(*)::int AS n FROM users WHERE email = ANY(${emails})`;
  check("test accounts deleted", left.n === 0);

  console.log(failures ? `\n${failures} check(s) FAILED.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

run().catch(async (error) => {
  console.error("\nCould not finish the test:", error.message);
  await cleanup().catch(() => {});
  process.exitCode = 1;
});
