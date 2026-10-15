-- Recommender state (Phase 6).

-- One row per feedback button press on a recommended problem. "skip" hides the problem;
-- "too_easy" / "too_hard" hide it too and move that topic's window up / down a step on that platform.
CREATE TABLE IF NOT EXISTS rec_feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  platform   TEXT NOT NULL,              -- 'cf' | 'lc'
  problem_id TEXT NOT NULL,              -- CF problem key ('2050-B') or LC slug
  topic_id   TEXT NOT NULL,
  kind       TEXT NOT NULL,              -- 'skip' | 'too_easy' | 'too_hard'
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rec_feedback_topic ON rec_feedback(topic_id, platform);

-- Mix of the Day, frozen per local day so it stays the same until midnight (or a manual reshuffle).
CREATE TABLE IF NOT EXISTS daily_mix (
  day          TEXT PRIMARY KEY,         -- local YYYY-MM-DD
  generated_at INTEGER NOT NULL,
  items_json   TEXT NOT NULL
);

-- Start time of every Codeforces contest, so recommendations can prefer recent problems.
CREATE TABLE IF NOT EXISTS cf_contest_times (
  contest_id INTEGER PRIMARY KEY,
  start_time INTEGER NOT NULL
);
