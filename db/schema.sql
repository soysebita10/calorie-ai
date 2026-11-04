-- CalorieAI schema. Safe to run repeatedly (npm run db:migrate).

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only the SHA-256 of each session token is stored, so a database leak
-- does not expose usable login cookies.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT        PRIMARY KEY,
  user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

-- Per-user data. Later stages (meal logs, subscriptions) follow this pattern:
-- a user_id foreign key, always filled from the session and never from input.
CREATE TABLE IF NOT EXISTS nutrition_goals (
  user_id        BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  daily_calories INTEGER     NOT NULL CHECK (daily_calories BETWEEN 800 AND 10000),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shared counters: login limits and the daily AI limit, across all Vercel instances
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT        PRIMARY KEY,   -- hashed; no raw emails or IPs
  count        INTEGER     NOT NULL,
  window_start TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS meals (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name       TEXT         NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  source     TEXT         NOT NULL CHECK (source IN ('photo', 'text')),
  items      JSONB        NOT NULL DEFAULT '[]',  -- foods and estimated portions
  calories   INTEGER      NOT NULL CHECK (calories BETWEEN 0 AND 20000),
  protein_g  NUMERIC(6,1) NOT NULL CHECK (protein_g >= 0),
  carbs_g    NUMERIC(6,1) NOT NULL CHECK (carbs_g >= 0),
  fat_g      NUMERIC(6,1) NOT NULL CHECK (fat_g >= 0),
  eaten_on   DATE         NOT NULL,  -- the user's local date, so totals match their day
  ai_model   TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meals_user_date_idx ON meals (user_id, eaten_on DESC);

-- One row per user who has started paying or been granted premium. No row means Free.
-- Card details stay with Stripe and are never stored here.
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id                BIGINT      PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  stripe_customer_id     TEXT        UNIQUE,
  stripe_subscription_id TEXT        UNIQUE,
  status                 TEXT,                           -- copied from Stripe
  period_end             TIMESTAMPTZ,                    -- next renewal, or when it ends
  cancel_scheduled       BOOLEAN     NOT NULL DEFAULT false,
  comped                 BOOLEAN     NOT NULL DEFAULT false, -- premium without Stripe (demo account)
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
