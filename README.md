# CalorieAI

AI-powered calorie tracking SaaS by **Sebastian Nieves**. Class project.

**Current stage:** user accounts. AI meal analysis and Stripe payments are not built yet.

## Stack

- Next.js (App Router) hosted on Vercel
- Neon PostgreSQL through `@neondatabase/serverless`
- bcrypt password hashing (cost 12)
- Database-backed sessions in an HttpOnly cookie, valid for 30 days

## Project layout

| Path | Purpose |
| --- | --- |
| `app/page.tsx`, `app/styles.css` | Homepage and original site styles |
| `app/auth.css` | Styles for the login, signup and dashboard pages |
| `app/login`, `app/signup`, `app/dashboard` | Pages |
| `app/api/auth/*`, `app/api/goal` | Server endpoints |
| `lib/session.ts` | Creates, reads and ends sessions |
| `lib/password.ts`, `lib/validation.ts` | Password hashing, input rules |
| `db/schema.sql` | Tables: `users`, `sessions`, `nutrition_goals` |
| `scripts/migrate.mjs` | Creates the tables |
| `scripts/verify-auth.mjs` | End-to-end auth test |

## Setup

You need [Node.js LTS](https://nodejs.org) (22.9 or newer). On Windows you can run
`winget install OpenJS.NodeJS.LTS`, then open a new terminal.

### 1. Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project. Pick the region closest to you.
2. On the project dashboard, click **Connect** and copy the connection string.
   Keep **Connection pooling** on. The host name should contain `-pooler`.

### 2. Run it locally

```bash
npm install
```

Copy `.env.example` to `.env.local` and paste your connection string as `DATABASE_URL`.
Then:

```bash
npm run db:migrate    # creates the tables
npm run dev           # starts http://localhost:3000
```

In a second terminal, while the app is running:

```bash
npm run verify:auth
```

Every line should say `PASS`, ending with `All checks passed.` The test creates two
accounts on `@example.com` and deletes them afterwards.

If PowerShell says running scripts is disabled, run this once:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### 3. Deploy to Vercel

1. In Vercel, open your project, or use **Add New > Project** and import the GitHub repo.
2. Go to **Settings > Environment Variables** and add `DATABASE_URL` with the same value,
   for all environments.
3. If the project already existed as a static site, open **Settings > Build and Deployment**
   and turn off any overrides for the build command and output directory.
   `vercel.json` already selects Next.js.
4. Push to `main`. Vercel builds and deploys automatically.

To test the live site, keep `.env.local` in place so the test can also inspect and clean up
the database:

```powershell
$env:BASE_URL="https://your-app.vercel.app"; npm run verify:auth
```

## Security notes

- Secrets live only in environment variables. `.env.local` is ignored by git.
- Only a SHA-256 hash of each session token is stored, and logging out deletes it on the server.
- Every per-user query takes the user id from the session, never from the request.
- POST endpoints reject cross-site requests.

**Not built yet:** login rate limiting, email verification and password reset.
