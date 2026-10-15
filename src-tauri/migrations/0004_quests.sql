-- Quests, contests and reminders (Phase 7).

-- "Mark as solved": LeetCode only exposes the 20 most recent accepted solves, so older ones are
-- marked by hand. Treated as solved everywhere a solve is checked (recommendations, quests, goals).
CREATE TABLE IF NOT EXISTS manual_solves (
  platform   TEXT NOT NULL,              -- 'lc' (the schema allows 'cf' too)
  problem_id TEXT NOT NULL,              -- LC slug / CF problem key
  title      TEXT NOT NULL,
  topic_id   TEXT,
  solved_at  INTEGER NOT NULL,
  PRIMARY KEY (platform, problem_id)
);

-- Daily quests, frozen per local day. completed_at is set once, the first time a sync (or a
-- manual mark) shows the quest done, so completion never "un-happens" and the reward plays once.
CREATE TABLE IF NOT EXISTS daily_quests (
  day          TEXT NOT NULL,            -- local YYYY-MM-DD
  quest_id     TEXT NOT NULL,
  spec_json    TEXT NOT NULL,
  xp           INTEGER NOT NULL,
  completed_at INTEGER,
  PRIMARY KEY (day, quest_id)
);

-- "I'll attend" toggles.
CREATE TABLE IF NOT EXISTS contest_attend (
  contest_id TEXT PRIMARY KEY,           -- 'cf:<id>' | 'lc:<slug>'
  created_at INTEGER NOT NULL
);

-- Your result in a finished Codeforces contest (from contest.standings), fetched once per contest.
CREATE TABLE IF NOT EXISTS contest_results (
  contest_id       TEXT PRIMARY KEY,     -- 'cf:<id>'
  name             TEXT NOT NULL,
  start_time       INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  participated     INTEGER NOT NULL,     -- 0 = checked, you weren't in the standings
  rank             INTEGER,
  solved           INTEGER,
  total            INTEGER,
  problems_json    TEXT NOT NULL,        -- [{ index, name, rating, solved }]
  synced_at        INTEGER NOT NULL
);

-- Problems queued for upsolving after a contest you took part in.
CREATE TABLE IF NOT EXISTS upsolve_queue (
  problem_key   TEXT PRIMARY KEY,
  contest_id    INTEGER NOT NULL,
  problem_index TEXT NOT NULL,
  name          TEXT NOT NULL,
  rating        INTEGER,
  tags_json     TEXT NOT NULL,
  contest_name  TEXT NOT NULL,
  added_at      INTEGER NOT NULL
);

-- Contest length, so a finished round's in-contest window is known after it leaves `contests`.
ALTER TABLE cf_contest_times ADD COLUMN duration_seconds INTEGER;
