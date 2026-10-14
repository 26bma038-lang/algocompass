import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

/** Opens a web page in the default browser (tauri-plugin-opener), or a new tab in plain-browser dev. */
export function openExternal(url: string) {
  if (isTauri()) void openUrl(url);
  else window.open(url, "_blank", "noopener");
}
