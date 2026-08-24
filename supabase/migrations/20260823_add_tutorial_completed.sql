-- Adds a tutorial_completed flag to the players table. New accounts default
-- to false so they're routed through the first-run flow (learn-01 → learn-02)
-- on their next visit; existing accounts should be flipped to true so we don't
-- re-force people who've already been playing.
--
-- Run this once in the Supabase SQL editor.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- One-time backfill: everyone who signed up before this column existed has
-- almost certainly already learned the moves, so mark them complete.
UPDATE players SET tutorial_completed = TRUE WHERE tutorial_completed IS FALSE;
