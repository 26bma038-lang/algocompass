/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by the Tauri CLI during `tauri dev` / `tauri build` ("windows", …); absent in plain Vite. */
  readonly TAURI_ENV_PLATFORM?: string;
}
