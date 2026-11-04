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
