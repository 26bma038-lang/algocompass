// Runs Lighthouse (mobile and desktop) against the local site and prints the four scores.
// Run from the repo root: node website/tools/lighthouse.mjs [outDir]
// Needs Chrome installed; Lighthouse itself comes through npx.
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import { serve } from "./serve.mjs";

const out = path.resolve(process.argv[2] ?? "website/tools/.lighthouse");
fs.mkdirSync(out, { recursive: true });
const PORT = 4411;
const server = await serve(PORT);
const url = `http://localhost:${PORT}/algocompass/`;

for (const preset of ["mobile", "desktop"]) {
  const file = path.join(out, `${preset}.json`);
  const preset_ = preset === "desktop" ? " --preset=desktop" : "";
  // Async on purpose: a sync call would block this process, and with it the server Lighthouse is loading.
  await promisify(exec)(`npx -y lighthouse@13 ${url}${preset_} --output=json --output-path="${file}" --quiet --chrome-flags="--headless=new"`, { maxBuffer: 64 << 20 });
  const lhr = JSON.parse(fs.readFileSync(file, "utf8"));
  const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, c]) => [k, Math.round(c.score * 100)]));
  console.log(preset, scores);
  for (const a of Object.values(lhr.audits)) {
    if (a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== "informative" && a.scoreDisplayMode !== "notApplicable") {
      console.log(`  ${a.id}: ${a.score} ${a.displayValue ?? ""}`);
    }
  }
  const m = lhr.audits;
  console.log(`  LCP ${m["largest-contentful-paint"].displayValue}, CLS ${m["cumulative-layout-shift"].displayValue}, TBT ${m["total-blocking-time"].displayValue}`);
}
server.close();
