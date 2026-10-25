// A tiny static server for the website, mounted at /algocompass/ like GitHub Pages.
// node website/tools/serve.mjs [port]   (or import { serve } for the other tools)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".json": "application/json",
};

export function serve(port = 4321) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (!url.pathname.startsWith("/algocompass/")) {
      res.writeHead(302, { Location: "/algocompass/" });
      return res.end();
    }
    let rel = decodeURIComponent(url.pathname.slice("/algocompass/".length)) || "index.html";
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(SITE, rel);
    if (!file.startsWith(SITE) || rel.startsWith("tools") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(SITE, "404.html")));
    }
    const body = fs.readFileSync(file);
    // GitHub Pages serves with gzip and a 10 minute cache; close enough for local checks.
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "max-age=600" });
    res.end(body);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.argv[2] ?? 4321);
  await serve(port);
  console.log(`http://localhost:${port}/algocompass/`);
}
