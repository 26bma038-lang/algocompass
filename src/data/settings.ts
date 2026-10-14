import { isTauri } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Handles {
  codeforces: string;
  leetcode: string;
}

export const DEFAULT_HANDLES: Handles = {
  codeforces: "enkrid",
  leetcode: "xfO61DFAh6",
};

const STORE_FILE = "settings.json";
const HANDLES_KEY = "handles";

let storePromise: Promise<Store> | null = null;
function getStore() {
  storePromise ??= Store.load(STORE_FILE);
  return storePromise;
}

/** Reads handles from tauri-plugin-store (localStorage when running in a plain browser). */
export async function readHandles(): Promise<Handles> {
  if (!isTauri()) {
    const raw = localStorage.getItem(HANDLES_KEY);
    return raw ? { ...DEFAULT_HANDLES, ...(JSON.parse(raw) as Partial<Handles>) } : DEFAULT_HANDLES;
  }
  const store = await getStore();
  const saved = await store.get<Partial<Handles>>(HANDLES_KEY);
  return { ...DEFAULT_HANDLES, ...saved };
}

export async function writeHandles(handles: Handles): Promise<Handles> {
  const clean: Handles = {
    codeforces: handles.codeforces.trim(),
    leetcode: handles.leetcode.trim(),
  };
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
