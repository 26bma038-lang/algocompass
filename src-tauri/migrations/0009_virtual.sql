-- Virtual contests (v1.7): a past Codeforces round, timed at its real length, on your own.
--
-- The round's name is kept with every contest's start time, so past rounds can be filtered by
-- division without keeping the whole contest list in `contests` (which holds the last 60 days).
ALTER TABLE cf_contest_times ADD COLUMN name TEXT;

-- One row per virtual contest you started. What you solved is never stored here: it comes from
-- your synced Codeforces submissions inside [started_at, ended_at or started_at + duration).
-- problems_json: the round's problems when you started ([{index, name, rating, tags}]).
CREATE TABLE IF NOT EXISTS virtual_contests (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  contest_id       INTEGER NOT NULL,
  name             TEXT NOT NULL,
  started_at       INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  ended_at         INTEGER,
  problems_json    TEXT NOT NULL
);
