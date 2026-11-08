// Builds a signed release and writes latest.json for the in-app updater (v1.7).
//
//   node scripts/release.mjs                      build + write release-out/latest.json
//   node scripts/release.mjs --publish notes.md   ...then gh release create vX.Y.Z with every asset
//
// The signing key lives outside the repo: %USERPROFILE%\.tauri\algocompass.key (override with
// TAURI_SIGNING_PRIVATE_KEY_PATH; set TAURI_SIGNING_PRIVATE_KEY_PASSWORD if it has a password).
// Run from PowerShell (cargo's linker, see CLAUDE.md).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const REPO = "26bma038-lang/algocompass";

const keyPath = process.env.TAURI_SIGNING_PRIVATE_KEY_PATH || join(homedir(), ".tauri", "algocompass.key");
if (!existsSync(keyPath)) {
  console.error(`No signing key at ${keyPath}. Generate one: npx tauri signer generate -w "${keyPath}"`);
  process.exit(1);
}
const args = process.argv.slice(2);
const publishAt = args.indexOf("--publish");
const notesFile = publishAt >= 0 ? args[publishAt + 1] : null;
if (publishAt >= 0 && (!notesFile || !existsSync(notesFile))) {
  console.error("--publish needs a notes file: node scripts/release.mjs --publish notes.md");
  process.exit(1);
}

const run = (cmd, argv, opts = {}) => {
  const r = spawnSync(cmd, argv, { cwd: root, stdio: "inherit", shell: process.platform === "win32", ...opts });
  if (r.status !== 0) {
    console.error(`${cmd} ${argv.join(" ")} failed (${r.status})`);
    process.exit(r.status ?? 1);
  }
};

run("npm", ["run", "tauri", "build"], {
  env: { ...process.env, TAURI_SIGNING_PRIVATE_KEY: readFileSync(keyPath, "utf8").trim() },
});

const bundle = join(root, "src-tauri", "target", "release", "bundle");
const setup = `AlgoCompass_${version}_x64-setup.exe`;
const msi = `AlgoCompass_${version}_x64_en-US.msi`;
const files = [join(bundle, "nsis", setup), join(bundle, "nsis", `${setup}.sig`), join(bundle, "msi", msi)];
for (const f of files) {
  if (!existsSync(f)) {
    console.error(`Missing build output: ${f}`);
    process.exit(1);
  }
}

const out = join(root, "release-out");
mkdirSync(out, { recursive: true });
const notes = notesFile ? readFileSync(notesFile, "utf8").trim() : `AlgoCompass ${version}`;
const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(files[1], "utf8").trim(),
      url: `https://github.com/${REPO}/releases/download/v${version}/${setup}`,
    },
  },
};
writeFileSync(join(out, "latest.json"), JSON.stringify(latest, null, 2) + "\n");
for (const f of [files[0], files[2]]) copyFileSync(f, join(out, f.split(/[\/]/).pop()));
console.log(`\nWrote release-out/latest.json for ${version}`);

if (notesFile) {
  run("gh", ["release", "create", `v${version}`, join(out, setup), join(out, msi), join(out, "latest.json"), "--title", `AlgoCompass ${version}`, "--notes-file", notesFile, "--latest"]);
}
