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
