// Screenshots of the website: desktop (1440x900) and phone (390x844), Light and Dark, the first
// screen and the full page. Run from the repo root:
//   node website/tools/screens.mjs [outDir]     (default docs/screenshots/website)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "./pw.mjs";
import { serve } from "./serve.mjs";

const out = path.resolve(process.argv[2] ?? "docs/screenshots/website");
fs.mkdirSync(out, { recursive: true });
const PORT = 4399;
const server = await serve(PORT);
const browser = await chromium.launch();

const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
};

for (const [device, opts] of Object.entries(DEVICES)) {
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({ ...opts, colorScheme: theme });
    // Don't hit the GitHub API from screenshots; show what the API would fill in.
    await ctx.route("https://api.github.com/**", (route) =>
      route.fulfill({
        json: {
          tag_name: "v1.4.0",
          assets: [{ name: "AlgoCompass_1.4.0_x64-setup.exe", size: 4531721, browser_download_url: "https://github.com/26bma038-lang/algocompass/releases/download/v1.4.0/AlgoCompass_1.4.0_x64-setup.exe" }],
        },
      }),
    );
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${PORT}/algocompass/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2200); // the load sequence
    await page.screenshot({ path: path.join(out, `${device}-${theme}.png`) });

    // Walk down the page so every reveal and count-up runs, then take the whole page.
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(1200);
    // A screen per section (the full page can't show the sticky showcase as it really looks).
    {
      for (const [name, sel, offset] of [["paths", "#paths", 0], device === "desktop" ? ["features", '[data-feature="3"]', -330] : ["features", "#features", 0], ["how", "#how", 0], ["install", "#install", 0], ["faq", "#faq", 0]]) {
        await page.evaluate(([sel, offset]) => {
          const el = document.querySelector(sel);
          window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80 + offset, behavior: "instant" });
        }, [sel, offset]);
        await page.waitForTimeout(name === "how" ? 3600 : 900);
        await page.screenshot({ path: path.join(out, `${device}-${theme}-${name}.png`) });
      }
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, `${device}-${theme}-full.png`), fullPage: true });
    console.log(device, theme);
    await ctx.close();
  }
}
await browser.close();
server.close();
