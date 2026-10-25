// Recomputes the CSP hash of index.html's inline theme script after it changes.
// Run from the repo root: node website/tools/csp-hash.mjs
import fs from "node:fs";
import crypto from "node:crypto";

const file = "website/index.html";
const html = fs.readFileSync(file, "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const hash = crypto.createHash("sha256").update(script).digest("base64");
const next = html.replace(/'sha256-[A-Za-z0-9+/=]+'/, `'sha256-${hash}'`);
fs.writeFileSync(file, next);
console.log(next === html ? "CSP hash already current" : `CSP hash updated: sha256-${hash}`);
