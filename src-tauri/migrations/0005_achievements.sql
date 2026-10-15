-- Achievements (Phase 8). One row per unlock, recorded the first time it's seen, so an
-- achievement never re-locks (e.g. a topic that later decays below Strong).
CREATE TABLE IF NOT EXISTS achievements (
  id          TEXT PRIMARY KEY,
  unlocked_at INTEGER,                  -- when it was earned; NULL = earned before tracking (date unknown)
  recorded_at INTEGER NOT NULL          -- when AlgoCompass first saw it
);
