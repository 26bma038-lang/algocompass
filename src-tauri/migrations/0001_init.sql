-- AlgoCompass schema v1. Shared by tauri-plugin-sql (Rust migrations) and sql.js (browser dev + tests).

CREATE TABLE IF NOT EXISTS profiles (
  platform   TEXT PRIMARY KEY,           -- 'cf' | 'lc'
  handle     TEXT NOT NULL,
  data_json  TEXT NOT NULL,              -- normalized CfUser / LcProfile
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cf_submissions (
  id             INTEGER PRIMARY KEY,
  problem_key    TEXT NOT NULL,
  contest_id     INTEGER,
  problem_index  TEXT NOT NULL,
  problem_name   TEXT NOT NULL,
  problem_rating INTEGER,
  tags_json      TEXT NOT NULL,
  verdict        TEXT,
  created_at     INTEGER NOT NULL,
  language       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cf_submissions_created ON cf_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_cf_submissions_problem ON cf_submissions(problem_key);

CREATE TABLE IF NOT EXISTS cf_problems (
  key          TEXT PRIMARY KEY,
  contest_id   INTEGER,
  problem_index TEXT NOT NULL,
  name         TEXT NOT NULL,
  rating       INTEGER,
  tags_json    TEXT NOT NULL,
  solved_count INTEGER
);

CREATE TABLE IF NOT EXISTS cf_rating_history (
  contest_id   INTEGER PRIMARY KEY,
  contest_name TEXT NOT NULL,
  rank         INTEGER NOT NULL,
  old_rating   INTEGER NOT NULL,
  new_rating   INTEGER NOT NULL,
  at           INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lc_stats (
  username             TEXT PRIMARY KEY,
  ranking              INTEGER,
  easy                 INTEGER NOT NULL,
  medium               INTEGER NOT NULL,
  hard                 INTEGER NOT NULL,
  all_solved           INTEGER NOT NULL,
  total_easy           INTEGER NOT NULL,
  total_medium         INTEGER NOT NULL,
  total_hard           INTEGER NOT NULL,
  contest_rating       REAL,
  contest_attended     INTEGER,
  contest_global_rank  INTEGER,
  contest_top_percent  REAL,
  updated_at           INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lc_tag_counts (
  slug   TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  level  TEXT NOT NULL,
  solved INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lc_contest_history (
  start_time INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  rating     REAL NOT NULL,
  ranking    INTEGER NOT NULL,
  solved     INTEGER NOT NULL,
  total      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lc_recent_ac (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  slug      TEXT NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_activity (
  day      TEXT NOT NULL,                -- YYYY-MM-DD
  platform TEXT NOT NULL,
  count    INTEGER NOT NULL,
  PRIMARY KEY (day, platform)
);

CREATE TABLE IF NOT EXISTS contests (
  id               TEXT PRIMARY KEY,     -- 'cf:<id>' | 'lc:<slug>'
  platform         TEXT NOT NULL,
  name             TEXT NOT NULL,
  start_time       INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  phase            TEXT NOT NULL,
  url              TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contests_start ON contests(start_time);

CREATE TABLE IF NOT EXISTS sync_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  platform    TEXT NOT NULL,
  kind        TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  finished_at INTEGER NOT NULL,
  status      TEXT NOT NULL,             -- 'ok' | 'error' | 'skipped'
  message     TEXT,
  items       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sync_log_kind ON sync_log(kind, finished_at);
