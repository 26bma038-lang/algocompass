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
  /** Upsolve: Codeforces problems you tried and never got accepted ("Unfinished problems" until v1.4 polish). */
  unfinished: "Problems you tried",
  /** v1.4 polish: Practice's tag on the one problem to do now (the same one Today's Do this next picks). */
  recommendedNext: "Recommended next",
  /** v1.4 polish: Progress. The button beside the tabs back to doing, and the weekly review's fold. */
  continuePractice: "Continue today's practice",
  weeklyDetails: "Weekly details",
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
  /** v1.4 step 2b: Learn. The link that opens a topic's panel ("Topic details", then "How strong am I at this?"). */
  howStrong: "View topic progress",
  videoLibrary: "Video library",
  moreTopics: "More topics",
  /** v1.4 step 2b: Practice. */
  sheets: "Sheets",
  lessonProblems: "Problems from your lessons",
  followSheet: "Follow a popular sheet",
  moreByTopic: "More by topic",
  /** "Mark sections done" on a sheet page. */
  alreadyDone: "I've already done some",
  nextInSheet: "Next in this sheet",
  /** v1.4 step 2b: Progress. Achievements. */
  badges: "Badges",
  badgeEarned: "Badge earned",
  yourPath: "Your path",
  yourWeek: "Your week",
  showAsMap: "Show as map",
  showAsList: "Show as list",
  /** v1.5: the coding language. Settings' "Language" section holds both languages. */
  language: "Language",
  videoLanguage: "Video language",
  codeIn: "I code in",
  /** A video that explains the idea without coding in any one language. */
  concept: "Concept",
  allLanguages: "All languages",
  /** v1.6: full YouTube playlists. */
  playlists: "Playlists",
  fullCourses: "Full courses",
  continuePlaylist: "Continue where I left off",
  watchedNext: "I've watched it, next part",
  watchedLast: "I've watched it",
} as const;

/** v1.6: a playlist part, "Part 12 of 56". */
export const partOf = (n: number, of: number) => `Part ${n} of ${of}`;

/** v1.6: "3 of 29 watched". */
export const watchedOf = (done: number, total: number) => `${done} of ${total} watched`;

/** v1.5: the four coding languages, as the app names them. */
export const CODE_LANG_NAMES = { cpp: "C++", java: "Java", python: "Python", js: "JavaScript" } as const;

/** A video's language chip: "Concept", "C++", "Python"… */
export const videoCodeLabel = (code: keyof typeof CODE_LANG_NAMES | "concept") => (code === "concept" ? LABELS.concept : CODE_LANG_NAMES[code]);

/** The lesson slot for a walkthrough in your language: "Code it in Python". */
export const codeItIn = (lang: keyof typeof CODE_LANG_NAMES) => `Code it in ${CODE_LANG_NAMES[lang]}`;

/** Learn's default filter: your language's videos plus the ones that explain the idea ("Java + concepts"). */
export const myLangAndConcepts = (lang: keyof typeof CODE_LANG_NAMES) => `${CODE_LANG_NAMES[lang]} + concepts`;

/** A topic's strength status in plain words (v1.4): "Developing" reads as jargon, "Getting there" doesn't. */
export const STATUS_WORDS = {
  Weak: "Weak",
  Developing: "Getting there",
  Strong: "Strong",
  Mastered: "Mastered",
  Untouched: "Not tried yet",
  Locked: "Not tried yet",
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

/** A count always says what it counts (v1.4 polish): "0 of 5 solved", "2 of 9 done". */
export const solvedOf = (done: number, total: number) => `${done} of ${total} solved`;
export const doneOf = (done: number, total: number) => `${done} of ${total} done`;

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
  // v1.4 step 2b.
  "Mark sections done": LABELS.alreadyDone,
  "Topic details": LABELS.howStrong,
  // v1.4 polish.
  "How strong am I at this?": LABELS.howStrong,
  "Unfinished problems": LABELS.unfinished,
  "unfinished problems": "problems you tried",
  Achievements: LABELS.badges,
  "Achievement unlocked": LABELS.badgeEarned,
  "achievements unlocked": "badges earned",
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
  upsolve: "problems you tried",
  upsolves: "problems you tried",
  Sync: LABELS.update,
  sync: "update",
  Synced: LABELS.updated,
  synced: "updated",
  syncs: "updates",
  syncing: "updating",
  Syncing: "Updating",
};
