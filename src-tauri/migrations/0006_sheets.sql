-- Sheets, the Beginner Path and video lessons (v1.3).

-- Ticks you set by hand on sheet problems. One row per problem key ('lc:two-sum', 'gfg:…', 'tuf:…'),
-- shared by every sheet that lists the problem. 'done' = ticked by hand ('manual') or by "Mark
-- sections done" ('bulk'); 'undone' = you unticked it, which also hides an automatic tick until a
-- newer solve shows up. A single manual tick on a LeetCode problem is also saved in manual_solves
-- (the existing "Mark solved"), so it counts everywhere a solve does; bulk ticks are not, so an
-- import of old solves never counts as today's work.
CREATE TABLE IF NOT EXISTS sheet_ticks (
  problem_key TEXT PRIMARY KEY,
  state       TEXT NOT NULL,             -- 'done' | 'undone'
  source      TEXT NOT NULL,             -- 'manual' | 'bulk'
  at          INTEGER NOT NULL
);

-- Private notes per sheet problem. Stored only here.
CREATE TABLE IF NOT EXISTS sheet_notes (
  problem_key TEXT PRIMARY KEY,
  body        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- "Mark as watched" on lesson and resource videos (YouTube video id).
CREATE TABLE IF NOT EXISTS video_watched (
  video_id   TEXT PRIMARY KEY,
  watched_at INTEGER NOT NULL
);

-- Beginner Path steps, recorded the first time a step is seen done, so its reward moment plays once
-- and a step never re-locks (e.g. after unticking a problem).
CREATE TABLE IF NOT EXISTS path_steps (
  step_id      TEXT PRIMARY KEY,
  completed_at INTEGER NOT NULL
);
