-- Revision queue (v1.7): solved problems come back after 7 and 30 days (3 if you needed help).
--
-- One row per problem key ("lc:two-sum", "cf:4-A"), only for problems you flagged ("needed help") or
-- reviewed. The solve time itself is never copied here: it comes from your synced and manual solves.
-- stage: reviews done (0 = none yet, 1 = the first came back, 2 = finished).
-- next_at: when set, overrides the schedule (a review you said was still hard comes back in 3 days).
CREATE TABLE IF NOT EXISTS revisions (
  problem_key TEXT PRIMARY KEY,
  needed_help INTEGER NOT NULL DEFAULT 0,
  stage       INTEGER NOT NULL DEFAULT 0,
  next_at     INTEGER,
  updated_at  INTEGER NOT NULL
);
