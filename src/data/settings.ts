import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PREVIEW, previewSeed } from "@/lib/sandbox";
import type { Repo } from "./repo";

export interface Handles {
  codeforces: string;
  leetcode: string;
}

/** No defaults: a new install asks for handles on first launch (src/features/onboarding). */
export const DEFAULT_HANDLES: Handles = {
  codeforces: "",
  leetcode: "",
};

const STORE_FILE = "settings.json";
const HANDLES_KEY = "handles";

let storePromise: Promise<Store> | null = null;
function getStore() {
  storePromise ??= Store.load(STORE_FILE);
  return storePromise;
}

/** Debug → preview profile: settings live only in memory, so the real store is never touched. */
const previewStore = PREVIEW ? previewSeed(PREVIEW) : null;

/** Reads handles from tauri-plugin-store (localStorage when running in a plain browser). */
export async function readHandles(): Promise<Handles> {
  if (previewStore) return { ...DEFAULT_HANDLES, ...(previewStore.get(HANDLES_KEY) as Partial<Handles> | undefined) };
  if (!isTauri()) {
    const raw = localStorage.getItem(HANDLES_KEY);
    return raw ? { ...DEFAULT_HANDLES, ...(JSON.parse(raw) as Partial<Handles>) } : DEFAULT_HANDLES;
  }
  const store = await getStore();
  const saved = await store.get<Partial<Handles>>(HANDLES_KEY);
  return { ...DEFAULT_HANDLES, ...saved };
}

/** The handles the user actually saved, or null when nothing (or no Codeforces handle) is saved. */
export async function readSavedHandles(): Promise<Handles | null> {
  let saved: Partial<Handles> | null | undefined;
  if (previewStore) {
    saved = previewStore.get(HANDLES_KEY) as Partial<Handles> | undefined;
  } else if (!isTauri()) {
    try {
      const raw = localStorage.getItem(HANDLES_KEY);
      saved = raw ? (JSON.parse(raw) as Partial<Handles>) : null;
    } catch {
      saved = null;
    }
  } else {
    saved = await (await getStore()).get<Partial<Handles>>(HANDLES_KEY);
  }
  const h = { ...DEFAULT_HANDLES, ...saved };
  return h.codeforces.trim() ? h : null;
}

/**
 * A new install has no handles, so the app shows the welcome screen instead of someone else's
 * stats. Installs from before v1.0.1 never saved their handles (they ran on built-in defaults), so
 * when the database already holds synced profiles, those handles are adopted and saved: an existing
 * install keeps its data and never sees onboarding.
 */
export interface HandleSource {
  readSaved: () => Promise<Handles | null>;
  write: (h: Handles) => Promise<unknown>;
  repo: Pick<Repo, "getProfile">;
}

/** Handles to use, or null when the welcome screen should ask for them. */
export async function resolveHandles(src: HandleSource): Promise<Handles | null> {
  const saved = await src.readSaved();
  if (saved) return saved;
  const [cf, lc] = await Promise.all([src.repo.getProfile("cf"), src.repo.getProfile("lc")]);
  if (!cf) return null;
  const adopted: Handles = { codeforces: cf.handle, leetcode: lc?.handle ?? "" };
  await src.write(adopted);
  return adopted;
}

/**
 * v1.3: Beginner mode finishes onboarding without any handle, so "onboarded" is its own flag. It's
 * set at the end of the welcome screen (both modes); installs from before v1.3 never need it, since
 * they always have a Codeforces handle.
 */
const ONBOARDED_KEY = "onboarded";

export async function readOnboarded(): Promise<boolean> {
  return (await readPref<boolean>(ONBOARDED_KEY)) === true;
}

export async function writeOnboarded(): Promise<void> {
  await writePref(ONBOARDED_KEY, true);
}

/** Handles to use (possibly both empty for a beginner), or null while the welcome screen should show. */
export async function resolveAppHandles(src: HandleSource & { onboarded: () => Promise<boolean>; readAll: () => Promise<Handles> }): Promise<Handles | null> {
  const h = await resolveHandles(src);
  if (h) return h;
  return (await src.onboarded()) ? src.readAll() : null;
}

export const hasAnyHandle = (h: Handles | null | undefined) => !!h && (h.codeforces.trim() !== "" || h.leetcode.trim() !== "");

export async function writeHandles(handles: Handles): Promise<Handles> {
  const clean: Handles = {
    codeforces: handles.codeforces.trim(),
    leetcode: handles.leetcode.trim(),
  };
  if (previewStore) {
    previewStore.set(HANDLES_KEY, clean);
    return clean;
  }
  if (!isTauri()) {
    localStorage.setItem(HANDLES_KEY, JSON.stringify(clean));
    return clean;
  }
  const store = await getStore();
  await store.set(HANDLES_KEY, clean);
  await store.save();
  return clean;
}

const handlesKey = ["settings", "handles"] as const;

export function useHandles() {
  return useQuery({ queryKey: handlesKey, queryFn: readHandles, staleTime: Infinity });
}

export function useSaveHandles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: writeHandles,
    onSuccess: (saved) => queryClient.setQueryData(handlesKey, saved),
  });
}

/** Small app-state values (not user settings) kept in the same store file. */
export async function readPref<T>(key: string): Promise<T | null> {
  if (previewStore) return (previewStore.get(key) as T | undefined) ?? null;
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem(`pref:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  return (await (await getStore()).get<T>(key)) ?? null;
}

export async function writePref<T>(key: string, value: T): Promise<void> {
  if (previewStore) {
    previewStore.set(key, value);
    return;
  }
  if (!isTauri()) {
    try {
      localStorage.setItem(`pref:${key}`, JSON.stringify(value));
    } catch {
      // Storage blocked: the value just won't persist.
    }
    return;
  }
  const store = await getStore();
  await store.set(key, value);
  await store.save();
}
