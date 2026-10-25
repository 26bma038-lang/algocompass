// Turns the app's real screenshots (docs/) into the website's WebP images, in Light and Dark,
// at 1100px and 640px wide. Run from the repo root: node website/tools/images.mjs
//
// The lesson screenshots were taken in the Debug "Preview a profile" sandbox, which shows a
// "Preview: a fresh beginner profile" banner under the title bar. That banner isn't part of the
// app a user sees, so it's cut out (rows 36-72) and the bottom gets 36 rows of the plain
// background back, keeping every image 1100x700.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "./pw.mjs";

const root = process.cwd();
const out = path.join(root, "website/img/shots");
const b = "docs/audit-v1.4/step2b";
const SHOTS = {
  today: `${b}/s01-today-THEME.png`,
  learn: `${b}/s02-learn-THEME.png`,
  lesson: `${b}/b02-lesson-watch-THEME.png`,
  sheets: `${b}/s04-sheet-neetcode-THEME.png`,
  progress: `${b}/s05-progress-THEME.png`,
  contests: "docs/audit-v1.4/step2a/after-s04-contests-THEME.png",
};
const CROP_BANNER = new Set(["lesson"]);
const WIDTHS = [1100, 640];

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<canvas></canvas>");

for (const [name, pattern] of Object.entries(SHOTS)) {
  for (const theme of ["dark", "light"]) {
    const src = path.join(root, pattern.replace("THEME", theme));
    const dataUrl = "data:image/png;base64," + fs.readFileSync(src).toString("base64");
    for (const w of WIDTHS) {
      const webp = await page.evaluate(
        async ({ dataUrl, w, crop }) => {
          const img = new Image();
          img.src = dataUrl;
          await img.decode();
          const W = img.naturalWidth;
          const H = img.naturalHeight;
          const full = document.createElement("canvas");
          full.width = W;
          full.height = H;
          const f = full.getContext("2d");
          if (crop) {
            f.drawImage(img, 0, 0, W, 36, 0, 0, W, 36);
            f.drawImage(img, 0, 72, W, H - 72, 0, 36, W, H - 72);
            f.drawImage(img, 0, H - 10, W, 10, 0, H - 36, W, 36);
          } else {
            f.drawImage(img, 0, 0);
          }
          const c = document.createElement("canvas");
          c.width = w;
          c.height = Math.round((H * w) / W);
          const ctx = c.getContext("2d");
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(full, 0, 0, c.width, c.height);
          return c.toDataURL("image/webp", w > 800 ? 0.86 : 0.82);
        },
        { dataUrl, w, crop: CROP_BANNER.has(name) },
      );
      const file = path.join(out, `${name}-${theme}-${w}.webp`);
      fs.writeFileSync(file, Buffer.from(webp.split(",")[1], "base64"));
      console.log(path.relative(root, file), Math.round(fs.statSync(file).size / 1024) + " KB");
    }
  }
}
await browser.close();
