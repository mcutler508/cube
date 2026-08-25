-- Reconstructed from the client code — verify against the live Supabase project before applying to a fresh environment.
--
-- The `players` table backs the custom passcode-based sign-in in
-- src/auth/players.ts. This project does NOT use Supabase Auth; the anon
-- key + PostgREST is the only path in, so the RLS policies below are
-- permissive on purpose. If you migrate to Supabase Auth later, tighten
-- these policies (e.g. `auth.uid() = id`) before the cutover.
--
-- Column types match what the TypeScript PlayerRow interface reads back.
-- `id` is a client-generated UUID (crypto.randomUUID) stored as text so
-- the weak fallback path in generatePlayerId() also inserts cleanly.

CREATE TABLE IF NOT EXISTS players (
  id                  text        PRIMARY KEY,
  name                text        NOT NULL,
  email               text,
  passcode_hash       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  tutorial_completed  boolean     NOT NULL DEFAULT FALSE
);

-- Handles are lowercased client-side (see normalizeHandle in
-- src/auth/handle.ts), so a plain case-sensitive unique index is enough
-- to prevent case-collision duplicates like "MikeC" vs "mikec".
CREATE UNIQUE INDEX IF NOT EXISTS players_name_key
  ON players (name);

-- Email is optional but must be unique when present. Partial index skips
-- NULLs so multiple rows without an email don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS players_email_key
  ON players (email)
  WHERE email IS NOT NULL;

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Permissive policies: the app uses a custom passcode scheme rather than
-- Supabase Auth, so every request comes in as the `anon` role. If you
-- adopt Supabase Auth later, replace these with policies keyed on
-- `auth.uid()` (or a service-role edge function for writes).
DROP POLICY IF EXISTS players_anon_select ON players;
CREATE POLICY players_anon_select
  ON players FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS players_anon_insert ON players;
CREATE POLICY players_anon_insert
  ON players FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS players_anon_update ON players;
CREATE POLICY players_anon_update
  ON players FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
