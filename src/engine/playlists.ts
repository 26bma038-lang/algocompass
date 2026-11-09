import { fitsMyLang, type CodeLang, type VideoCode } from "./codeLang";
import type { VideoLang } from "./path";

/**
 * Full YouTube playlists (v1.6): whole courses and topic series, every video in playlist order
 * (src/data/playlists.json, filled from YouTube by `npm run fill:playlists`). Pure: the data layer
 * hands in the playlists, what's watched and where you left off.
 */

export interface PlaylistVideo {
  /** YouTube video id. */
  id: string;
  title: string;
  minutes: number;
}

export interface Playlist {
  /** YouTube playlist id. */
  id: string;
  /** v1.8: the short curated name the app shows ("Binary search, beginner to advanced"); `title` is YouTube's own, kept for verification and shown on hover. */
  name: string;
  lang: VideoLang;
  /** A whole DSA course, or one topic. */
  scope: "course" | "topic";
  kind: "lectures" | "walkthroughs";
  /** Topic ids (topics.json); the first is where it's grouped. */
  topics: string[];
  title: string;
  channel: string;
  codeLang: VideoCode;
  alsoCodeLang?: CodeLang[];
  videos: PlaylistVideo[];
}

export interface PlaylistFilter {
  lang: "all" | VideoLang;
  /** Concept playlists plus the ones that code in this language; null = every language. */
  codeLang: CodeLang | null;
  /** Only playlists that cover this topic (courses included). */
  topic: string | null;
}

export function filterPlaylists(list: readonly Playlist[], f: PlaylistFilter): Playlist[] {
  return list.filter((p) => (f.lang === "all" || p.lang === f.lang) && (!f.codeLang || fitsMyLang(p, f.codeLang)) && (!f.topic || p.topics.includes(f.topic)));
}

export interface PlaylistGroup {
  topicId: string;
  playlists: Playlist[];
}

/**
 * Full courses first, then one group per topic in `topicOrder` (the library's order: weakest first
 * in smart mode, the path's order for beginners). A topic playlist sits under its first topic only,
 * so each playlist shows once; topics without one are left out.
 */
export function groupPlaylists(list: readonly Playlist[], topicOrder: readonly string[]): { courses: Playlist[]; groups: PlaylistGroup[] } {
  const courses = list.filter((p) => p.scope === "course");
  const byTopic = new Map<string, Playlist[]>();
  for (const p of list) if (p.scope === "topic") byTopic.set(p.topics[0]!, [...(byTopic.get(p.topics[0]!) ?? []), p]);
  const order = [...topicOrder, ...[...byTopic.keys()].filter((t) => !topicOrder.includes(t))];
  return { courses, groups: order.flatMap((t) => (byTopic.has(t) ? [{ topicId: t, playlists: byTopic.get(t)! }] : [])) };
}

export const playlistMinutes = (p: Pick<Playlist, "videos">) => p.videos.reduce((n, v) => n + v.minutes, 0);

/** "45 min", "3 h", "31 h": a playlist's length, rounded the way a person says it. */
export function lengthLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return h < 10 ? `${Math.round(h * 2) / 2} h`.replace(".0 h", " h") : `${Math.round(h)} h`;
}

export function playlistProgress(p: Pick<Playlist, "videos">, watched: ReadonlySet<string>): { watched: number; total: number } {
  return { watched: p.videos.filter((v) => watched.has(v.id)).length, total: p.videos.length };
}

/**
 * Where "Continue where I left off" lands (an index into the playlist): the part you last opened,
 * unless you've since marked it watched, then the next part not watched yet after it. With nothing
 * opened yet, the first part not watched yet. A finished playlist lands on its last part opened (or
 * the first).
 */
export function resumeIndex(p: Pick<Playlist, "videos">, lastVideoId: string | null | undefined, watched: ReadonlySet<string>): number {
  const last = lastVideoId ? p.videos.findIndex((v) => v.id === lastVideoId) : -1;
  if (last >= 0 && !watched.has(p.videos[last]!.id)) return last;
  const after = p.videos.findIndex((v, i) => i > last && !watched.has(v.id));
  if (after >= 0) return after;
  const any = p.videos.findIndex((v) => !watched.has(v.id));
  if (any >= 0) return any;
  return Math.max(0, last);
}

/**
 * The part after the furthest one you've watched (the playlist page's "Continue where I left off"
 * when you've wandered off it), or null with nothing watched yet or the last part watched.
 */
export function frontierIndex(p: Pick<Playlist, "videos">, watched: ReadonlySet<string>): number | null {
  let furthest = -1;
  p.videos.forEach((v, i) => watched.has(v.id) && (furthest = i));
  return furthest >= 0 && furthest < p.videos.length - 1 ? furthest + 1 : null;
}

