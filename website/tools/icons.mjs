// Renders the Open Graph image (img/og.jpg, 1200x630) from tools/og.html, plus the PNG favicons
// from favicon.svg (the app icon's source). Run from the repo root: node website/tools/icons.mjs
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "./pw.mjs";

const site = path.resolve("website");
const browser = await chromium.launch();

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(pathToFileURL(path.join(site, "tools/og.html")).href);
await og.evaluate(() => document.fonts.ready);
await og.waitForTimeout(300);
await og.screenshot({ path: path.join(site, "img/og.jpg"), type: "jpeg", quality: 88 });
console.log("img/og.jpg", Math.round(fs.statSync(path.join(site, "img/og.jpg")).size / 1024) + " KB");

const svg = fs.readFileSync(path.join(site, "favicon.svg"), "utf8");
for (const [file, size] of [["apple-touch-icon.png", 180], ["favicon-32.png", 32]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<style>html,body{margin:0;background:${file === "apple-touch-icon.png" ? "#070b16" : "transparent"}}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  // apple-touch-icon gets an opaque ground (iOS fills transparency with black).
  await p.screenshot({ path: path.join(site, file), omitBackground: file !== "apple-touch-icon.png" });
  console.log(file);
}
await browser.close();
