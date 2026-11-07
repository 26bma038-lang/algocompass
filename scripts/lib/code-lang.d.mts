// Types for code-lang.mjs, so the app's tests can check the tagging rules (src/data/codeLangs.test.ts).
export const VIDEO_CODES: string[];
export const CODE_LANGS: string[];
export interface TagTable {
  titleRules: { pattern: string; lang: string }[];
  walkthroughTitle: string;
  channels: Record<string, { codes: string | null; when?: "always" | "walkthrough"; why: string }>;
  overrides?: Record<string, { codeLang: string; why: string }>;
}
export interface TaggedVideo {
  id: string;
  title: string;
  channel: string;
  role: string;
  codeLang?: string;
  alsoCodeLang?: string[];
}
export type Derived = { codeLang: string; alsoCodeLang: string[]; error?: undefined } | { error: string; codeLang?: undefined; alsoCodeLang?: undefined };
export function loadTable(root: string): TagTable;
export function videoUses(path: unknown, resources: unknown): { v: TaggedVideo; where: string; role: string; roles: Set<string> }[];
export function deriveCodeLang(v: { id: string; title: string; channel: string }, roles: Set<string>, table: TagTable): Derived;
export function tagProblems(v: { codeLang?: string; alsoCodeLang?: string[] }, derived: Derived): string[];
export function playlistRoles(p: { kind: string }): Set<string>;
