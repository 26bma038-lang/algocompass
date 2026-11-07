/**
 * The language a learner writes code in (v1.5), and the language a video codes in. Lessons stop
 * assuming one: a lesson's main video explains the idea ("concept"), and a "Code it in <language>"
 * slot points at a verified walkthrough in yours. Pure: no I/O, no React.
 */

export type CodeLang = "cpp" | "java" | "python" | "js";

/** What a video codes in: one of the four languages, or nothing in particular ("concept"). */
export type VideoCode = "concept" | CodeLang;

export const CODE_LANGS: readonly CodeLang[] = ["cpp", "java", "python", "js"];
export const VIDEO_CODES: readonly VideoCode[] = ["concept", ...CODE_LANGS];

export const DEFAULT_CODE_LANG: CodeLang = "cpp";

export const isCodeLang = (v: unknown): v is CodeLang => typeof v === "string" && (CODE_LANGS as readonly string[]).includes(v);
export const isVideoCode = (v: unknown): v is VideoCode => typeof v === "string" && (VIDEO_CODES as readonly string[]).includes(v);

/** The tags a video carries (src/data/code-langs.json). */
export interface Coded {
  codeLang: VideoCode;
  alsoCodeLang?: readonly CodeLang[];
}

/** The video writes code in this language (its tag, or another language its title names). */
export const codesIn = (v: Coded, lang: CodeLang) => v.codeLang === lang || (v.alsoCodeLang?.includes(lang) ?? false);

/** Learn's default filter: videos that explain the idea, plus those that code in your language. */
export const fitsMyLang = (v: Coded, lang: CodeLang) => v.codeLang === "concept" || codesIn(v, lang);

/** The other languages, closest first (syntax and standard library), for "nothing in yours yet". */
export const CLOSEST: Record<CodeLang, readonly CodeLang[]> = {
  cpp: ["java", "python", "js"],
  java: ["cpp", "python", "js"],
  python: ["js", "java", "cpp"],
  js: ["python", "java", "cpp"],
};

export type CodeItIn<V> =
  | { kind: "match"; video: V }
  /** Nothing verified in your language: the closest walkthrough in another one (or none at all). */
  | { kind: "none"; alternative: { video: V; lang: CodeLang } | null };

/**
 * A lesson's "Code it in <language>" slot (v1.5). `candidates` come in the caller's order of
 * relevance (the lesson's own videos first, then its topics' videos). A video that codes in your
 * language wins, in your video language when there is one. With none, the closest alternative: your
 * video language first, then the nearest language (CLOSEST), then the caller's order.
 */
export function pickCodeItIn<V extends Coded & { lang: "en" | "hi" }>(candidates: readonly V[], lang: CodeLang, videoLang: "en" | "hi"): CodeItIn<V> {
  const mine = candidates.filter((v) => codesIn(v, lang));
  const match = mine.find((v) => v.lang === videoLang) ?? mine[0];
  if (match) return { kind: "match", video: match };
  const ranked = candidates.flatMap((v, i) =>
    CLOSEST[lang].flatMap((other, rank) => (codesIn(v, other) ? [{ video: v, lang: other, score: (v.lang === videoLang ? 0 : 1000) + rank * 100 + i }] : [])),
  );
  ranked.sort((a, b) => a.score - b.score);
  const best = ranked[0];
  return { kind: "none", alternative: best ? { video: best.video, lang: best.lang } : null };
}

/**
 * The "Code it in" candidates for Beginner Path step `step` (0-based), most relevant first: the
 * lesson's own videos, then the videos filed under its topics (its main topic first).
 */
export function lessonCandidates<V extends { step?: number }>(groups: readonly { topicId: string; videos: readonly V[] }[], step: number, topics: readonly string[]): V[] {
  const all = groups.flatMap((g) => g.videos.map((v) => ({ v, topicId: g.topicId })));
  const own = all.filter((x) => x.v.step === step).map((x) => x.v);
  const topical = topics.flatMap((t) => all.filter((x) => x.topicId === t && x.v.step !== step).map((x) => x.v));
  return [...own, ...topical];
}
