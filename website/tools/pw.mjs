// Loads Playwright for the website tools. It isn't a project dependency (the app doesn't need it):
// set PLAYWRIGHT_DIR to a node_modules folder that has it, or it falls back to the npx cache.
import { createRequire } from "node:module";
import path from "node:path";

const dir =
  process.env.PLAYWRIGHT_DIR ??
  "C:/Users/sahil/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules";
const require = createRequire(path.join(dir, "noop.js"));
export const { chromium } = require("playwright");
