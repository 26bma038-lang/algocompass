// A tiny static server for the website, mounted at /algocompass/ like GitHub Pages.
// node website/tools/serve.mjs [port]   (or import { serve } for the other tools)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
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
      // Like the github.io root: only the project path exists (so /robots.txt is a 404 there too).
      if (url.pathname === "/" || url.pathname === "/algocompass") {
        res.writeHead(302, { Location: "/algocompass/" });
        return res.end();
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    let rel = decodeURIComponent(url.pathname.slice("/algocompass/".length)) || "index.html";
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.join(SITE, rel);
    if (!file.startsWith(SITE) || rel.startsWith("tools") || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(SITE, "404.html")));
    }
    let body = fs.readFileSync(file);
    // Like GitHub Pages: text is gzipped, and everything gets a 10 minute cache.
    const headers = { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream", "Cache-Control": "max-age=600" };
    if (/text|svg|json|xml/.test(headers["Content-Type"]) && /gzip/.test(req.headers["accept-encoding"] ?? "")) {
      body = zlib.gzipSync(body);
      headers["Content-Encoding"] = "gzip";
    }
    res.writeHead(200, headers);
    res.end(body);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const port = Number(process.argv[2] ?? 4321);
  await serve(port);
  console.log(`http://localhost:${port}/algocompass/`);
}
