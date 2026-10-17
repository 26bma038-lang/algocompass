import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

/**
 * The desktop side (src-tauri/src/lib.rs): notifications, the tray menu, the reminder scheduler
 * and autostart. Every call is a no-op in a plain browser, so `npm run dev` keeps working.
 */

let permission: Promise<boolean> | null = null;

/** Asks Windows once per launch; later calls reuse the answer. */
async function canNotify(): Promise<boolean> {
  if (!isTauri()) return false;
  permission ??= (async () => {
    const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
    if (await isPermissionGranted()) return true;
    return (await requestPermission()) === "granted";
  })().catch(() => false);
  return permission;
}

/** A Windows toast. Fails soft: a blocked notification never breaks the caller. */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (!(await canNotify())) return;
    const { sendNotification } = await import("@tauri-apps/plugin-notification");
    sendNotification({ title, body });
  } catch {
    // Notifications are a nudge, not a feature anything depends on.
  }
}

/** One reminder for the Rust scheduler (it fires while the window is hidden in the tray). */
export interface ScheduledReminder {
  key: string;
  /** Epoch seconds: fire at or after this… */
  at: number;
  /** …but not after this (a reminder that's too late to be true is dropped). */
  expiresAt: number;
  title: string;
  body: string;
}

/** Replaces the whole reminder schedule. Rust remembers what it already fired, across restarts. */
export async function pushSchedule(items: readonly ScheduledReminder[]): Promise<void> {
  if (!isTauri()) return;
  try {
    // Make sure permission was asked before the first reminder is due.
    if (items.length) await canNotify();
    await invoke("set_reminders", { items });
  } catch (e) {
    console.warn("[AlgoCompass] couldn't push reminders", e);
  }
}

/** The tray menu's status line ("Quests 1/3") and tooltip. */
export async function setTrayStatus(text: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("set_tray_status", { text });
  } catch {
    // The tray is cosmetic.
  }
}

/** "Sync now" from the tray menu. */
export function onTraySync(handler: () => void): () => void {
  if (!isTauri()) return () => undefined;
  let un: UnlistenFn | null = null;
  let cancelled = false;
  void listen("tray-sync", handler).then((fn) => {
    if (cancelled) fn();
    else un = fn;
  });
  return () => {
    cancelled = true;
    un?.();
  };
}

/** A screen picked from the tray menu ("Today", "Practice", …): the route to open. */
export function onTrayNavigate(handler: (path: string) => void): () => void {
  if (!isTauri()) return () => undefined;
  let un: UnlistenFn | null = null;
  let cancelled = false;
  void listen<string>("tray-navigate", (e) => handler(e.payload)).then((fn) => {
    if (cancelled) fn();
    else un = fn;
  });
  return () => {
    cancelled = true;
    un?.();
  };
}

export async function autostartEnabled(): Promise<boolean | null> {
  if (!isTauri()) return null;
  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostart(on: boolean): Promise<void> {
  if (!isTauri()) throw new Error("Launch on startup only works in the desktop app");
  const { enable, disable } = await import("@tauri-apps/plugin-autostart");
  await (on ? enable() : disable());
}
