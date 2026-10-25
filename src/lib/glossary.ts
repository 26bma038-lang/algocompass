/**
 * v1.4: the words the app shows, in one place, so a label reads the same on every screen, in Ctrl+K,
 * the tray and notifications. Plain words first (a first-year student who has never opened LeetCode
 * should understand them). `glossary.test.ts` fails if an old name comes back in user-facing text.
 */

export const LABELS = {
  /** Daily quests (the engine still calls them quests). */
  goals: "Today's goals",
  goalsShort: "Goals",
  goal: "goal",
  goalComplete: "Goal complete",
  /** The mix of the day. */
  todaysProblems: "Today's problems",
  newSet: "New set",
  /** Upsolve: Codeforces problems you tried and never got accepted. */
  unfinished: "Unfinished problems",
  /** Sync. */
  update: "Update",
  updateNow: "Update now",
  updating: "Updating…",
  updated: "Updated",
  updateFailed: "Update failed",
  notUpdated: "Not updated yet",
  firstUpdate: "the first update",
  /** Blind spots: common topics at your level that you've never solved. */
  notTried: "Topics you haven't tried",
  notTriedShort: "Not tried yet",
  /** The Topics map (the skill tree). */
  topics: "Topics",
  /** v1.4 Today: the single best next action. */
  doThisNext: "Do this next",
  howToSolve: "How to solve on LeetCode",
  connectLc: "Connect LeetCode to tick automatically",
  /** v1.4 step 2b: Learn. "Topic details" (a link that opened the Topic panel). */
  howStrong: "How strong am I at this?",
  videoLibrary: "Video library",
  moreTopics: "More topics",
} as const;

/**
 * Plain names for the topics whose Codeforces tag means nothing to a beginner (v1.4). The plain
 * name comes first and the tag stays in brackets, so searching the tag still finds it.
 */
export const TOPIC_PLAIN: Readonly<Record<string, string>> = {
  implementation: "Coding basics (implementation)",
  "brute-force": "Try everything (brute force)",
  constructive: "Build-the-answer problems (constructive)",
  interactive: "Interactive problems",
  "data-structures": "Range queries (data structures)",
};

/** A topic's name as the user reads it: the plain name where there is one. */
export const plainTopicName = (id: string, name: string) => TOPIC_PLAIN[id] ?? name;

/** "Updated 5m ago". */
export const updatedAgo = (ago: string) => `${LABELS.updated} ${ago}`;

/** Terms that can't be avoided, each with a one-line explanation for a tooltip (`<Term>`). */
export const TERMS = {
  xp: {
    label: "XP",
    hint: "Points you earn for every problem you solve and every goal you finish. They add up to your level.",
  },
  level: {
    label: "Level",
    hint: "Goes up as you earn XP (points for solves and goals). It only measures how much you've practised.",
  },
  rating: {
    label: "Rating",
    hint: "Your Codeforces score. It goes up or down after every rated contest, depending on how you did.",
  },
  div: {
    label: "Div.",
    hint: "Division: how hard a Codeforces round is. Div. 3 and Div. 4 are for beginners, Div. 2 for ratings below 2100, Div. 1 for the strongest.",
  },
  strength: {
    label: "Strength",
    hint: "How solid a topic is for you, from 0 to 100: how many of its problems you've solved, and how hard they were.",
  },
  difficulty: {
    label: "Difficulty",
    hint: "Codeforces difficulty. 800 is the easiest; each +100 is a bit harder.",
  },
  streak: {
    label: "Streak",
    hint: "Days in a row you've solved at least one problem. Solve one today to keep it going.",
  },
} as const;

export type TermId = keyof typeof TERMS;

/**
 * Old names and the label that replaced them. The test scans user-facing strings for these; code
 * identifiers (useTodayQuests, upsolveQueue…) are fine.
 */
export const RETIRED: Record<string, string> = {
  "Today's quests": LABELS.goals,
  "Today's mix": LABELS.todaysProblems,
  "today's mix": LABELS.todaysProblems,
  "New mix": LABELS.newSet,
  Upsolve: LABELS.unfinished,
  "Sync now": LABELS.updateNow,
  "Syncing…": LABELS.updating,
  "first sync": LABELS.firstUpdate,
  "Blind spots": LABELS.notTried,
  "Blind spot": LABELS.notTriedShort,
  "blind spots": LABELS.notTried,
  "Topics map": LABELS.topics,
  "Quest complete": LABELS.goalComplete,
  Quests: LABELS.goalsShort,
  quests: "goals",
  Quest: "Goal",
  quest: "goal",
  upsolve: "unfinished problems",
  upsolves: "unfinished problems",
  Sync: LABELS.update,
  sync: "update",
  Synced: LABELS.updated,
  synced: "updated",
  syncs: "updates",
  syncing: "updating",
  Syncing: "Updating",
};
