-- Friends (v1.7): people you compare with, by their public Codeforces handle and/or LeetCode username.
-- Kept only on this computer; there is no server. stats_json is the last good read of their public
-- profiles (rating, solves this week, streak), refreshed with every update; error is the last failure.
CREATE TABLE IF NOT EXISTS friends (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  cf_handle  TEXT,
  lc_handle  TEXT,
  added_at   INTEGER NOT NULL,
  stats_json TEXT,
  fetched_at INTEGER,
  error      TEXT
);
