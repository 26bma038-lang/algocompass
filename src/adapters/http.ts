import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { Platform } from "@/data/types";

/** Minimal fetch signature adapters depend on, so tests and Node scripts can inject their own. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Inside Tauri, requests go through tauri-plugin-http (Rust side: no CORS, scoped by the
 * capability file to codeforces.com/api and leetcode.com/graphql). Outside Tauri (browser
 * dev, Node tests) it falls back to the global fetch.
 */
export const defaultFetch: FetchLike = (input, init) =>
  isTauri() ? tauriFetch(input, init) : globalThis.fetch(input, init);

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

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
