// The layout of src/data/sheets/<id>.json (one problem per line keeps diffs readable), and the
// difficulty fields every sheet problem carries. Shared by gen-sheets.mjs and fill-difficulty.mjs.

/** takeUforward's own levels (basic / core / pro) and NeetCode's, in LeetCode's words. */
export const LEVEL = { basic: "Easy", core: "Medium", pro: "Hard", Easy: "Easy", Medium: "Medium", Hard: "Hard" };

/**
 * A problem's difficulty, from the platform when it's there:
 * - `difficulty` + `difficultyFrom: "lc"`: LeetCode's own difficulty (GraphQL);
 * - `difficulty` + `difficultyFrom: "sheet"`: the sheet creator's own level, for a problem not on
 *   LeetCode (takeUforward's basic / core / pro);
 * - `rating`: the Codeforces problem rating (problemset.problems), when Codeforces has one;
 * - `difficulty: null` and nothing else when no one gives a difficulty (most of Babbar 450's
 *   GeeksforGeeks problems). Never guessed.
 */
export function difficultyFields({ lcMeta, cfMeta, level }) {
  const out = {};
  if (lcMeta?.difficulty) {
    out.difficulty = lcMeta.difficulty;
    out.difficultyFrom = "lc";
  } else if (level && LEVEL[level]) {
    out.difficulty = LEVEL[level];
    out.difficultyFrom = "sheet";
  } else out.difficulty = null;
  if (cfMeta && Number.isFinite(cfMeta.rating)) out.rating = cfMeta.rating;
  return out;
}

/** Puts the difficulty fields right after `title`/`sub` (where gen-sheets writes them), replacing old ones. */
export function withDifficulty(p, fields) {
  const out = {};
  const rest = Object.entries(p).filter(([k]) => !["difficulty", "difficultyFrom", "rating"].includes(k));
  for (const [k, v] of rest) {
    if (k === "topics") Object.assign(out, fields);
    out[k] = v;
  }
  if (!("topics" in p)) Object.assign(out, fields);
  return out;
}

/** The sheet file's text. */
export function sheetJson(doc) {
  const head = JSON.stringify({ ...doc, sections: undefined }, null, 2).replace(/\n}$/, "");
  const body = doc.sections
    .map((sec) => `    {\n      "title": ${JSON.stringify(sec.title)},\n      "problems": [\n${sec.problems.map((p) => `        ${JSON.stringify(p)}`).join(",\n")}\n      ]\n    }`)
    .join(",\n");
  return `${head},\n  "sections": [\n${body}\n  ]\n}\n`;
}
