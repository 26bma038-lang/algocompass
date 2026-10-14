-- Per-problem LeetCode metadata (difficulty + topic tags) for recently accepted problems.
CREATE TABLE IF NOT EXISTS lc_problems (
  slug       TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL,              -- 'Easy' | 'Medium' | 'Hard'
  tags_json  TEXT NOT NULL
);
