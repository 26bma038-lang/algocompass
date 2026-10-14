import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { Platform } from "@/data/types";

/** Minimal fetch signature adapters depend on, so tests and Node scripts can inject their own. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * True inside the Tauri webview (dev or packaged). Checked per request, never cached at module
 * load. `__TAURI_INTERNALS__` is the IPC bridge itself; `isTauri()` is the public flag on top of it.
 */
export function inTauri(): boolean {
  return isTauri() || (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
}

/**
 * Inside Tauri, requests go through tauri-plugin-http (Rust side: no CORS, scoped by the
 * capability file to codeforces.com/api and leetcode.com/graphql). Outside Tauri (browser
 * dev, Node tests) it falls back to the global fetch.
 */
export const defaultFetch: FetchLike = (input, init) =>
  inTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init);

export type AdapterErrorKind = "network" | "http" | "api" | "not-found" | "rate-limit" | "parse";

export class AdapterError extends Error {
  constructor(
    readonly platform: Platform,
    readonly kind: AdapterErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

/**
 * Turns whatever a fetch threw into an AdapterError. Tauri's plugin rejects with plain strings,
 * the browser with TypeErrors. A capability-scope denial is a config bug, not a network blip, so
 * it isn't retried or reported as "offline".
 */
export function fetchFailure(platform: Platform, site: string, e: unknown): AdapterError {
  const detail = e instanceof Error ? e.message : String(e);
  if (/not allowed|scope|forbidden by|permission/i.test(detail)) {
    return new AdapterError(platform, "api", `The app isn't allowed to call ${site} (${detail})`);
  }
  return new AdapterError(platform, "network", `Couldn't reach ${site} (${detail})`);
}

/** Network-level failures (DNS, offline, connection reset) are worth retrying; API errors aren't. */
export const isNetworkError = (e: unknown): boolean => e instanceof AdapterError && e.kind === "network";

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
