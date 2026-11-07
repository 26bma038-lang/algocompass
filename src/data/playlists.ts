import { useQuery } from "@tanstack/react-query";
import type { Playlist } from "@/engine/playlists";

/**
 * Full YouTube playlists (v1.6): src/data/playlists.json, filled from YouTube by
 * `npm run fill:playlists` and verified by `npm run check:links`. About 4,500 videos, so it loads
 * on first use (its own chunk) rather than with the app.
 */

let playlistsPromise: Promise<Playlist[]> | null = null;
export function loadPlaylists(): Promise<Playlist[]> {
  playlistsPromise ??= import("./playlists.json").then((m) => m.default.playlists as unknown as Playlist[]);
  return playlistsPromise;
}

export function usePlaylists() {
  return useQuery({ queryKey: ["static", "playlists"], queryFn: loadPlaylists, staleTime: Infinity, gcTime: Infinity });
}
