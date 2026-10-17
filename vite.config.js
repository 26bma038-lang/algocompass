import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
const host = process.env.TAURI_DEV_HOST;
// https://vite.dev/config/
export default defineConfig(() => ({
    plugins: [react(), tailwindcss()],
    // TAURI_ENV_* lets the desktop build drop browser-only code (the sql.js driver, src/data/db.ts).
    envPrefix: ["VITE_", "TAURI_ENV_"],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
        // Dev-only: lets the plain-browser build reach LeetCode GraphQL (no CORS there). Tauri doesn't use this.
        proxy: {
            "/__leetcode": {
                target: "https://leetcode.com",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/__leetcode/, ""),
                headers: { Referer: "https://leetcode.com/", Origin: "https://leetcode.com" },
            },
        },
        watch: {
            // 3. tell Vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
}));
