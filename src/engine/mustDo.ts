import type { LcDifficulty } from "@/data/types";
import type { Sheet, SheetProblem } from "./sheets";

/**
 * Must-do problems after a video (v1.6). Pure: the data layer hands in the bundled sheets (and the
 * Beginner Path as a sheet) and what's solved. A topic's must-do list is the problems the most
 * popular sheets agree on, easy to hard, so a video is followed by practice that ramps up.
 */

/** One distinct problem across every sheet, with the popular sheets that list it. */
export interface PoolProblem extends SheetProblem {
  /** Ids of the popular sheets (not the Beginner Path) that list it, in display order. */
  sheets: string[];
  /** Listed by the Beginner Path. */
  inPath: boolean;
  /** Topics a sheet files it under (a section's topic), as opposed to tag-derived ones. */
  leadTopics: string[];
}

export interface ProblemPool {
  problems: PoolProblem[];
  /** How many popular sheets there are ("On 4 of 5 popular sheets"). */
  sheetCount: number;
  /** Normalized platform title → problem, for matching a video title to the problem it solves. */
  byTitle: ReadonlyMap<string, PoolProblem>;
}

const DIFF_RANK: Record<LcDifficulty, number> = { Easy: 1, Medium: 2, Hard: 3 };

/** Codeforces ratings in LeetCode's three bands, so the two platforms sort together. */
export const CF_BANDS = { mediumFrom: 1300, hardFrom: 1800 } as const;

/**
 * A sortable difficulty: 1 Easy, 2 Medium, 3 Hard (a Codeforces rating falls into a band and sorts
 * by rating inside it), Infinity when no one rates the problem, so it goes last.
 */
export function difficultyRank(p: Pick<SheetProblem, "difficulty" | "rating">): number {
  if (p.difficulty) return DIFF_RANK[p.difficulty];
  if (typeof p.rating === "number") {
    const band = p.rating < CF_BANDS.mediumFrom ? 1 : p.rating < CF_BANDS.hardFrom ? 2 : 3;
    return band + p.rating / 10000;
  }
  return Infinity;
}

const isEasy = (p: Pick<SheetProblem, "difficulty" | "rating">) => difficultyRank(p) < 2;

/** A title reduced to letters and digits: "Pow(x, n)" → "pow x n", "Pascal's Triangle" → "pascals triangle". */
export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A better difficulty source wins when two sheets disagree: LeetCode's own, then a rating, then a sheet's level. */
function difficultyScore(p: SheetProblem): number {
  if (p.difficulty && p.difficultyFrom !== "sheet") return 3;
  if (typeof p.rating === "number") return 2;
  return p.difficulty ? 1 : 0;
}

/**
 * Every distinct problem in the given sheets (by key), with the popular sheets that list it and its
 * topics merged. `pathId` names the Beginner Path, which doesn't count as a popular sheet.
 */
export function buildPool(sheets: readonly Sheet[], pathId: string): ProblemPool {
  const byKey = new Map<string, PoolProblem>();
  for (const s of sheets) {
    for (const sec of s.sections) {
      for (const p of sec.problems) {
        let e = byKey.get(p.key);
        if (!e) {
          const { key, title, difficulty, difficultyFrom, rating, topics, lc, cf, premium, links } = p;
          e = { key, title, difficulty, topics: [...topics], sheets: [], inPath: false, leadTopics: [] };
          if (difficultyFrom) e.difficultyFrom = difficultyFrom;
          if (rating != null) e.rating = rating;
          if (lc) e.lc = lc;
          if (cf) e.cf = cf;
          if (premium) e.premium = true;
          if (links) e.links = links;
          byKey.set(p.key, e);
        } else {
          for (const t of p.topics) if (!e.topics.includes(t)) e.topics.push(t);
          if (difficultyScore(p) > difficultyScore(e)) {
            e.difficulty = p.difficulty;
            if (p.difficultyFrom) e.difficultyFrom = p.difficultyFrom;
            else delete e.difficultyFrom;
          }
          if (e.rating == null && p.rating != null) e.rating = p.rating;
          if (!e.links && p.links) e.links = p.links;
        }
        if (p.topics[0] && !e.leadTopics.includes(p.topics[0])) e.leadTopics.push(p.topics[0]);
        if (s.id === pathId) e.inPath = true;
        else if (!e.sheets.includes(s.id)) e.sheets.push(s.id);
      }
    }
  }
  const problems = [...byKey.values()];
  const byTitle = new Map<string, PoolProblem>();
  // Only LeetCode and Codeforces problems can be "solved in this video": their titles are the platform's own.
  for (const p of problems) if (p.lc || p.cf) byTitle.set(normTitle(p.title), p);
  return { problems, sheetCount: sheets.filter((s) => s.id !== pathId).length, byTitle };
}

// ---------- the problem a video solves ----------

/** Strong separators between the parts of a video title: "Two Sum | Brute-Better-Optimal", "Lecture 80: …". */
const STRONG_SPLIT = /\s*\|+\s*|\s*•\s*|:\s+/;
/** Weak separators inside a part: "Two Sum - Leetcode 1 - HashMap - Python". */
const WEAK_SPLIT = /\s+[-–—]+\s+/;
/** Numbering in front: "L5.", "Lecture 62:", "BS-1.", "DP 5.", "G-8.", "#12", "8 ". */
const LEADING_NUMBER = /^(?:#|\b(?:lecture|lec|lesson|ep|episode|part|day|video|question|problem|q|p|l|g|bs|dp|sw)\s*[-.]?\s*)?\d+[a-z]?\s*[.):\-]?\s+/i;
/** A platform tag in front: "Leetcode 704.", "LC 50:". */
const PLATFORM_PREFIX = /^(?:leetcode|lc|codeforces|cf|gfg|cses)\s*(?:problem\s*)?#?\d+[a-z]?\s*[.:)\-]?\s+/i;
/** Filler behind the name: "Two Sum Problem", "Valid Anagram (Leetcode 242)". */
const TRAILING_FILLER = /\s*\(?\b(?:problem|question|leetcode|lc|solution)(?:\s*#?\d+)?\)?\s*$/i;
/** A part that is only a platform tag: "Leetcode 1", "LC 50", "Codeforces 4A". */
const TAG_PART = /^(?:leetcode|lc|codeforces|cf|gfg)\s*(?:problem\s*)?#?\d*[a-z]?$/i;
/** A sequel marker part: "2", "II". */
const SEQUEL_PART = /^(i{1,3}|iv|[1-4])$/i;
/** A channel's own numbering with a difficulty ("Permutations - 2 Medium", Pepcoding): a different problem. */
const SERIES_PART = /^(?:i{1,3}|iv|\d+)\s+(?:easy|medium|hard)$/i;
const SEQUEL_WORD: Record<string, string> = { "1": "", i: "", "2": " ii", ii: " ii", "3": " iii", iii: " iii", "4": " iv", iv: " iv" };
/**
 * Words a part may be made of and still only describe how the problem is solved ("HashMap",
 * "Iterative AND Recursive", "3 Solutions", "Google Interview Question"), so the part beside it is
 * still the problem's name. Anything else ("Permutations - Words - 2") means a variant: no match.
 */
const APPROACH_WORDS = new Set(
  (
    "iterative recursive recursion and or brute better optimal best force greedy hashmap hash map set hashing dfs bfs depth breadth first " +
    "search binary sliding window two pointer pointers dp dynamic programming topological sort union find heap priority queue stack " +
    "backtracking graph trie bit manipulation math sorting prefix sum sums python java c cpp javascript js explained intuition easy medium " +
    "hard interview question questions solution solutions approach approaches code codes with in one shot tutorial google amazon facebook " +
    "meta microsoft apple twitch netflix uber bloomberg adobe phone screen coding visualized animated explanation multiple ways optimized"
  ).split(" "),
);

const cleanPart = (s: string) => normTitle(s.trim().replace(PLATFORM_PREFIX, "").replace(LEADING_NUMBER, "").replace(TRAILING_FILLER, ""));
const isApproach = (part: string) => {
  const words = normTitle(part).split(" ").filter(Boolean);
  return words.length > 0 && words.some((w) => !/^\d+$/.test(w)) && words.every((w) => APPROACH_WORDS.has(w) || /^\d+$/.test(w));
};

/**
 * The LeetCode or Codeforces problem a video title clearly names, or null. Exact only:
 * - the name must be the title's first part (before "|", "•" or ": "), without its numbering
 *   ("L5.", "Lecture 62:") or a "Leetcode 1" tag; a short label like "Sliding Window:" in front is
 *   skipped, and so are " - " parts that only say how it's solved ("Iterative & Recursive - …");
 * - and the problem's platform title must equal it. A sequel marker behind it picks the sequel
 *   ("Word Ladder - 2" is Word Ladder II, or nothing); any other qualifier ("Coin Change -
 *   Combinations") means a variant, so nothing.
 * "Two Sum - Leetcode 1 - HashMap - Python" names Two Sum; "EKO SPOJ Problem | Binary Search" and
 * "Binary Search Introduction | Iterative" name nothing.
 */
export function namedProblem(videoTitle: string, pool: Pick<ProblemPool, "byTitle">): PoolProblem | null {
  const title = videoTitle.trim().replace(PLATFORM_PREFIX, "").replace(LEADING_NUMBER, "");
  // Parts and the separators between them: ["Coin change problem", ": ", "Maximum number of ways"].
  const pieces = title.split(new RegExp(`(${STRONG_SPLIT.source})`));
  let at = 0;
  // "Sliding Window: Best Time to Buy and Sell Stock": a short label before a colon isn't the name.
  if (pieces.length > 2 && isApproach(pieces[0]!) && !pool.byTitle.has(cleanPart(pieces[0]!)) && pieces[1]!.includes(":")) at = 2;
  // A colon right behind the name starts a qualifier ("Coin change problem: Maximum number of ways"): a variant.
  if (pieces[at + 1]?.includes(":")) return null;
  const parts = (pieces[at] ?? "").split(WEAK_SPLIT);
  let i = 0;
  // A part that is a problem's name is the name, even in approach words ("Two Sum").
  while (i < parts.length - 1 && isApproach(parts[i]!) && !pool.byTitle.has(cleanPart(parts[i]!))) i++;
  const raw = parts[i] ?? "";
  // As written too, for names that start with a number or end in "Problem" ("01 Matrix", "The Skyline Problem").
  const names = [cleanPart(raw), normTitle(raw)];
  const next = parts[i + 1]?.trim();
  // The title says which platform: a LeetCode problem isn't named by "Permutations || Codeforces".
  const says = { lc: /\bleetcode\b/i.test(videoTitle), cf: /\bcodeforces\b/i.test(videoTitle) };
  const lookup = (s: string) => {
    const p = pool.byTitle.get(s) ?? null;
    if (!p) return null;
    if ((p.lc && says.cf && !says.lc) || (!p.lc && p.cf && says.lc && !says.cf)) return null;
    return p;
  };
  if (next && SERIES_PART.test(normTitle(next))) return null;
  const seq = next ? normTitle(next).match(SEQUEL_PART) : null;
  if (seq) {
    // "Word Ladder - 2" is Word Ladder II; "Jump Game - I" is Jump Game.
    const suffix = SEQUEL_WORD[seq[1]!.toLowerCase()]!;
    for (const n of names) {
      const hit = lookup(n + suffix);
      if (hit) return hit;
    }
    return null;
  }
  if (next && !TAG_PART.test(next) && !isApproach(next)) return null;
  for (const n of names) {
    // "Majority Element I" is Majority Element.
    const hit = lookup(n) ?? (/ (?:i|1)$/.test(n) ? lookup(n.replace(/ (?:i|1)$/, "")) : null);
    if (hit) return hit;
  }
  return null;
}

// ---------- the topic a video is about ----------

/**
 * Words that clearly name a topic in a video title, tried in this order (so "Binary Search Tree"
 * is Trees, "Topological Sort" is Graphs and "Heap Sort" is Heaps before any looser match).
 */
const TOPIC_WORDS: readonly (readonly [string, RegExp])[] = [
  ["string-algorithms", /\bkmp\b|\bz[- ]?(?:function|algorithm)|rabin[- ]?karp|rolling hash|string hashing|suffix array|manacher/i],
  ["tries", /\btries\b|\btrie\b/i],
  ["linked-lists", /linked ?lists?|\bdll\b/i],
  ["data-structures", /segment trees?|fenwick|binary indexed|sparse table|range (?:sum |min(?:imum)? |max(?:imum)? )?quer/i],
  ["dsu", /disjoint set|union[- ]find|\bdsu\b|spanning tree|\bmst\b|kruskal|\bprims?\b|prim'?s algorithm/i],
  ["shortest-paths", /shortest paths?|dijkstra|bellman|floyd/i],
  ["advanced-graphs", /max(?:imum)? flow|ford[- ]fulkerson|network flow|bipartite matching|\b2-?sat\b/i],
  ["trees", /binary search trees?|\bbst\b|binary trees?|\btrees?\b(?! of recursion)|inorder|preorder|postorder|lowest common ancestor|\blca\b/i],
  ["graphs", /\bgraphs?\b|\bbfs\b|\bdfs\b|topological|topo sort|breadth[- ]first|depth[- ]first|connected components|bipartite|kosaraju|tarjan|articulation|\bbridges\b/i],
  ["heaps", /\bheaps?\b|priority queue|heapify/i],
  ["stacks-queues", /\bstacks?\b|\bqueues?\b|\bdeque\b|monotonic|next greater|infix|postfix/i],
  ["greedy", /greedy|activity selection|job sequencing|fractional knapsack|huffman/i],
  ["dp", /dynamic programming|\bdp\b|memoi[sz]ation|tabulation|knapsack|longest common subsequence|\blcs\b|\blis\b|matrix chain|\bmcm\b/i],
  ["binary-search", /binary search|lower bound|upper bound/i],
  ["two-pointers", /two pointers?|2 pointers?|sliding window/i],
  ["prefix-sums", /prefix sums?|difference array/i],
  ["recursion-backtracking", /recursion|backtracking|n[- ]queens?|\bsubsets?\b|\bpermutations?\b|subsequences?/i],
  ["bitmasks", /bit manipulation|bitwise|bitmask|\bxor\b/i],
  ["game-theory", /game theory|\bnim\b|grundy|sprague/i],
  ["combinatorics", /combinatorics|\bncr\b|binomial|pigeonhole/i],
  ["probability", /probability|expected value/i],
  ["geometry", /geometry|convex hull/i],
  ["number-theory", /\bprimes?\b|sieve|\bgcd\b|\blcm\b|modular|modulo inverse|euclid|number theory|divisors?/i],
  ["divide-conquer", /divide (?:and|&) conquer/i],
  ["sorting", /\bsort(?:ing)?\b|merge sort|quick ?sort|bubble sort|insertion sort|selection sort/i],
  ["design", /\blru cache\b|\blfu cache\b|system design/i],
  ["strings", /\bstrings?\b|palindrom|anagram|substring/i],
  ["arrays-hashing", /\barrays?\b|hashing|hash ?maps?|hash ?tables?|hash ?sets?|\bmatrix\b/i],
  ["math", /\bmaths?\b|mathematics/i],
  ["implementation", /time complexity|space complexity|big[- ]?o\b|\bstl\b|pattern printing|star patterns?|\bloops?\b|if[- ]else|data types/i],
];

/** Topic ids a title clearly names, in TOPIC_WORDS order. */
export function topicsNamed(title: string): string[] {
  return TOPIC_WORDS.filter(([, re]) => re.test(title)).map(([id]) => id);
}

/**
 * The topic a video is about, for its must-do list:
 * - a video filed under one topic (the library, a one-topic playlist) is about that topic;
 * - otherwise (a full course, a playlist over a few topics) the topic its title names, limited to
 *   the playlist's topics when it has some; then the problem it solves, if that's on topic;
 * - then `previous`, the topic of the part before it (a course teaches a topic over a run of parts:
 *   "G-9. Flood Fill" sits among the graph parts);
 * - a topic playlist falls back to its first topic; a course part with none of these gets null.
 */
export function videoTopic(title: string, filed: readonly string[], named: PoolProblem | null = null, previous: string | null = null): string | null {
  if (filed.length === 1) return filed[0]!;
  const fits = (t: string) => !filed.length || filed.includes(t);
  const words = topicsNamed(title).filter(fits);
  if (words.length) return words[0]!;
  if (named) {
    const t = [...named.leadTopics, ...named.topics].find(fits);
    if (t) return t;
  }
  if (previous && fits(previous)) return previous;
  return filed[0] ?? null;
}

/** Every part's topic in a playlist, in order, each part carrying the topic of the one before it when it names none. */
export function partTopics(titles: readonly string[], filed: readonly string[], pool: Pick<ProblemPool, "byTitle">): (string | null)[] {
  const out: (string | null)[] = [];
  let previous: string | null = null;
  for (const t of titles) {
    previous = videoTopic(t, filed, namedProblem(t, pool), previous);
    out.push(previous);
  }
  return out;
}

// ---------- the list ----------

export type MustDoReason = "video" | "sheets" | "path";

export interface MustDoPick {
  problem: PoolProblem;
  /** "video": solved in this video; "sheets": on N popular sheets; "path": only in the Beginner Path. */
  reason: MustDoReason;
}

export interface MustDoOptions {
  /** How many problems at most (default 5). */
  n?: number;
  /** The problem the video solves (namedProblem): it goes first, solved or not. */
  named?: PoolProblem | null;
  /** Keys to keep even when solved (ticked on this screen, so the row doesn't vanish under the cursor). */
  keep?: ReadonlySet<string>;
  /** Keys to leave out (a lesson's own problems, already listed under Solve). */
  exclude?: ReadonlySet<string>;
}

/** Ranking: more popular sheets, filed under the topic, free before Premium, easier, then the pool's order. */
function compare(topic: string, order: ReadonlyMap<string, number>) {
  return (a: PoolProblem, b: PoolProblem) =>
    b.sheets.length - a.sheets.length ||
    Number(b.inPath) - Number(a.inPath) ||
    Number(b.leadTopics.includes(topic)) - Number(a.leadTopics.includes(topic)) ||
    Number(!!a.premium) - Number(!!b.premium) ||
    difficultyRank(a) - difficultyRank(b) ||
    order.get(a.key)! - order.get(b.key)!;
}

/**
 * Must-do problems for a topic, easy to hard. Candidates are the topic's problems not solved yet,
 * ranked by how many popular sheets list them (then the Beginner Path, then problems a sheet files
 * under the topic, free before Premium, easier first). The list keeps one or two Easy problems
 * (two when it shows four or more) and fills the rest with the best-ranked harder ones, then shows
 * them Easy → Medium → Hard, with problems no one rates last. The problem the video solves comes
 * first, as "Solved in this video".
 */
export function mustDo(pool: ProblemPool, topic: string, isSolved: (key: string) => boolean, opts: MustDoOptions = {}): MustDoPick[] {
  const n = opts.n ?? 5;
  const keep = opts.keep ?? new Set<string>();
  const exclude = opts.exclude ?? new Set<string>();
  const named = opts.named && !exclude.has(opts.named.key) ? opts.named : null;
  const order = new Map(pool.problems.map((p, i) => [p.key, i]));
  const cands = pool.problems
    .filter((p) => p.topics.includes(topic) && p.key !== named?.key && !exclude.has(p.key) && (keep.has(p.key) || !isSolved(p.key)))
    .sort(compare(topic, order));
  const room = n - (named ? 1 : 0);
  const easyWanted = room >= 4 ? 2 : 1;
  const easy = cands.filter(isEasy).slice(0, easyWanted);
  const harder = cands.filter((p) => !isEasy(p)).slice(0, room - easy.length);
  // Not enough harder ones: more easy ones fill the gap.
  const extraEasy = cands.filter((p) => isEasy(p) && !easy.includes(p)).slice(0, room - easy.length - harder.length);
  const picked = [...easy, ...extraEasy, ...harder];
  const rank = new Map(cands.map((p, i) => [p.key, i]));
  picked.sort((a, b) => difficultyRank(a) - difficultyRank(b) || rank.get(a.key)! - rank.get(b.key)!);
  const rows: MustDoPick[] = picked.map((p) => ({ problem: p, reason: p.sheets.length ? "sheets" : "path" }));
  return named ? [{ problem: named, reason: "video" }, ...rows] : rows;
}
