# Maintaining AlgoCompass

A hands-on guide for whoever keeps this app running, written so you don't need an AI assistant to follow it. Everything below runs on Windows. Product background is in `README.md` and `PRODUCT.md`, the design rules in `DESIGN.md`, and the full history of decisions in `PROGRESS.md` (newest version at the top).

**Use PowerShell for anything that touches Rust, Cargo or Tauri.** Git Bash ships its own `link.exe`, which hides the Microsoft linker, and the build fails with confusing linker errors. Plain `npm` and `node` commands work in either shell.

## 1. One-time setup

1. Install [Node.js](https://nodejs.org/) 20 or newer, [Rust](https://rustup.rs/) (stable, MSVC toolchain), and [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++** and a **Windows 11 SDK**.
2. Install the [GitHub CLI](https://cli.github.com/) and run `gh auth login` (needed only to publish releases).
3. Clone and install:

   ```powershell
   git clone https://github.com/26bma038-lang/algocompass.git
   cd algocompass
   npm install
   ```

## 2. Run, test and build

| What | Command | Notes |
|---|---|---|
| Desktop app with hot reload | `npm run tauri dev` | Uses your real data folder (see section 8). |
| UI only, in a browser | `npm run dev`, then open http://localhost:1420 | An in-memory database (sql.js). LeetCode goes through a Vite proxy. Good for UI work; nothing desktop-only (tray, notifications, Save dialog) runs. |
| Unit tests | `npm test` | Checks migration line endings, type-checks, then runs Vitest. Must pass before every commit. |
| Live API test | `$env:CF_HANDLE="tourist"; $env:LC_HANDLE="<username>"; npm run test:live` | A real update against Codeforces and LeetCode. Run it when an API seems broken. |
| Web build | `npm run build` | Type-check plus the Vite bundle. Must pass before every commit. |
| Data check | `npm run check:links` | Verifies every problem, video and playlist against the real sites (section 5). Takes a few minutes. |

A plain `npm run tauri build` **fails on purpose**: the updater needs signed artifacts. Use the release script (section 4) even for a local installer.

## 3. Rules that break things if ignored

- **Never edit a file in `src-tauri/migrations/` that has shipped.** The database stores a checksum of each migration; a changed file stops the app from starting. Add a new numbered file instead (`0011_….sql`) and list it in `migrations()` in `src-tauri/src/lib.rs`.
- **Migrations must use LF line endings.** A CRLF copy once bricked v1.3.0. `.gitattributes` enforces it, `npm test` and `npm run build` check it, and the app repairs line-ending-only mismatches at startup, but don't rely on the repair.
- **Keep the bundle identifier `com.algocompass.app`** (`src-tauri/tauri.conf.json`). The user's data folder is named after it; change it and every user appears to lose their data.
- **Never invent data.** Problem ids, video ids, playlist ids and difficulties always come from the platforms through the scripts below. Never hand-edit the generated fields.
- Platform API calls live only in `src/adapters/`. See `CLAUDE.md` for the rest of the architecture rules.

## 4. Releasing a new version

### The signing key

The in-app updater only installs updates signed with the project's key:

- Private key: `%USERPROFILE%\.tauri\algocompass.key` (password-protected).
- Public key: the `plugins.updater.pubkey` value in `src-tauri/tauri.conf.json` (and `algocompass.key.pub` next to the private key).
- Password: kept by the owner outside the repo (it was first written to `%USERPROFILE%\.tauri\algocompass-password.txt`; move it to a password manager).

**Back up the key file and its password somewhere safe (a password manager or an offline drive).** If either is lost, no installed copy can ever accept an update again; every user would have to download and install a new build by hand, and you'd need a new key pair. Never commit the key or the password, and never paste them into an issue or chat.

### Steps

1. Make sure `master` (or your release branch) is clean, then run `npm test`, `npm run check:links` and `npm run build`. All three must pass.
2. Bump the version in **four** places to the same number, for example `1.8.0`:
   - `package.json` → `"version"`
   - `package-lock.json` → the top-level `"version"` and `packages[""].version` (or run `npm install --package-lock-only` after editing `package.json`)
   - `src-tauri/tauri.conf.json` → `"version"`
   - `src-tauri/Cargo.toml` → `version` under `[package]` (then `cargo check` in `src-tauri` updates `Cargo.lock`)
3. Write the release notes in a file, e.g. `notes.md`, in plain English: what's new, the SmartScreen note (below), anything users must do. Keep it outside the repo or delete it after.
4. Back up your own data folder before testing a build on it (section 9).
5. Build and sign, from PowerShell in the repo root:

   ```powershell
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "<the password>"   # or leave it unset and the script asks
   node scripts/release.mjs
   Remove-Item Env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
   ```

   This builds the app, signs the installer, and writes three files to `release-out/` (git-ignored): `AlgoCompass_<version>_x64-setup.exe`, `AlgoCompass_<version>_x64_en-US.msi` and `latest.json`.
6. Test the build: run `src-tauri\target\release\algocompass.exe` (or install the setup.exe). It must start and show your data. Then quit it (tray → Quit) and run `node scripts/inspect-db.mjs`: it must list every migration (1 to the newest) and your rows (submissions, sheet ticks, notes) must still be there. If anything is wrong, restore your backup (section 9) and don't publish.
7. Commit the version bump, merge to `master`, tag and push:

   ```powershell
   git checkout master
   git merge --no-ff <release-branch>
   git tag v1.8.0
   git push origin master --tags
   ```

8. Publish the GitHub release with all three files. Either let the script do it (it rebuilds first):

   ```powershell
   node scripts/release.mjs --publish notes.md
   ```

   or upload the files you already built:

   ```powershell
   gh release create v1.8.0 release-out\AlgoCompass_1.8.0_x64-setup.exe release-out\AlgoCompass_1.8.0_x64_en-US.msi release-out\latest.json --title "AlgoCompass 1.8.0" --notes-file notes.md --latest
   ```

9. Check it worked: `gh release view v1.8.0` lists the three assets, and
   `https://github.com/26bma038-lang/algocompass/releases/latest/download/latest.json` downloads and shows the new version. That URL is what every installed copy checks once a day.

**SmartScreen note for the release notes:** the app isn't code-signed with a paid certificate, so Windows SmartScreen warns on first install. Users click **More info → Run anyway**. (The updater signature is a different thing: it proves an update came from you.)

**How updates reach users:** from v1.7.0 on, the app checks `latest.json` quietly once a day, downloads a newer signed version in the background, and shows "Restart to update". Copies older than 1.7.0 have no updater and must install once by hand.

## 5. Videos, playlists and the data scripts

All curated data lives in `src/data/`. The scripts fetch the real titles, channels, lengths and problems; you only choose ids.

### Adding a single video

1. Find the video on YouTube and copy its id (the part after `watch?v=`).
2. Add an entry with only the curated fields:
   - a topic video in `src/data/resources.json` under `topics.<topic id>.videos`: `{ "id": "…", "lang": "en" | "hi", "role": "intro" | "lecture" | "walkthrough" }`
   - a Beginner Path video in `src/data/path/beginner-path.json` under the step's `videos.en` or `videos.hi`: `{ "id": "…", "role": "main" | … }`
3. If the channel is new, add it to `channels` in `src/data/code-langs.json`: `"codes": null` (concept, the safe default) or a language (`cpp`, `java`, `python`, `js`) only if the channel codes on screen in that one language, with a one-line `why`.
4. Run `npm run fill:media` (title, channel, minutes), then `npm run tag:videos` (what it codes in), then `npm run check:links`.

### Adding a playlist

1. Open the channel's **Playlists** tab and copy the id from the playlist URL (`list=…`). Never type an id from memory. To list a channel's playlists from the terminal:

   ```powershell
   node -e "import('./scripts/lib/youtube.mjs').then(async m => console.table(await m.channelPlaylists('@takeUforward')))"
   ```

2. Add `{ "id": "PL…", "lang": "en" | "hi", "scope": "course" | "topic", "kind": "lectures" | "walkthroughs", "topics": ["…"] }` to `src/data/playlists.json`. Topic ids are in `src/data/topics.json`. Add a new channel to `code-langs.json` as above.
3. Run `npm run fill:playlists -- PL…` (only that one; without an id it refreshes all of them). It writes the title, channel, codeLang and every video in order, and warns if YouTube's captions suggest a different spoken language than `lang`.
4. Read the filled video titles and fix `topics` if the playlist covers more or less than you thought.
5. Run `npm run check:links`, `npm test` (a test counts topic coverage per language), and commit.

### Sheets

`src/data/sheets/*.json` (Striver A2Z and SDE, NeetCode 150, Blind 75, Love Babbar 450) are generated. Never edit them by hand.

```powershell
npm run gen:sheets                     # fetch each sheet's original source and rebuild every file
npm run gen:sheets -- --cache .sheets  # also keep the raw downloads (reused next time)
npm run fill:difficulty                # refresh difficulties from LeetCode / Codeforces
npm run check:links
```

If a source changed its page layout, `gen:sheets` reports the sheet as partial; fix the parser for that source in `scripts/gen-sheets.mjs`.

### When check:links fails

- A **video** fails when it was deleted, made private, or renamed. Renamed: run `npm run fill:media`. Gone: remove it, or replace it with another video from the same channel.
- A **playlist** fails the same way; a changed video count is only a warning, and `npm run fill:playlists -- <id>` refreshes it.
- A **LeetCode slug** fails when LeetCode renamed or removed the problem. Regenerate the sheet; for the Beginner Path, pick a replacement problem and run `npm run fill:media`.

## 6. When the LeetCode API breaks

LeetCode has no official API. The app uses the GraphQL endpoint its website uses (`https://leetcode.com/graphql`), and that can change without notice.

- **Everything LeetCode-specific is in `src/adapters/leetcode/index.ts`**: the queries (`Q`), and the code that validates each response field by field.
- **It fails soft by design.** Any LeetCode error becomes an `AdapterError("lc", …)`; the update logs it, keeps the last saved LeetCode data (marked stale), and Codeforces, sheets and everything else keep working. Users see a LeetCode error in the update status, not a broken app.

To fix it:

1. Reproduce: `$env:LC_HANDLE="<a public username>"; npm run test:live`. The failing query is named in the error.
2. Open leetcode.com in a browser, open DevTools → Network, filter for `graphql`, and load a profile page. Copy the query the site now sends and the shape of its answer.
3. Update the query in `Q` and the validation that reads it. Keep the rule: a missing field becomes `null` or empty, never a crash and never an invented number.
4. Update or add a stubbed response in `src/adapters/leetcode/leetcode.test.ts`, then run `npm test` and the live test again.
5. Release a patch version (section 4).

Codeforces uses its official, stable API (`src/adapters/codeforces/`), rate-limited to one call every 2 seconds. Its problems are usually short outages; the app retries on the next update.

## 7. Where things are

| Path | What |
|---|---|
| `src/adapters/` | The only code that talks to Codeforces and LeetCode. |
| `src/engine/` | Pure logic (strength, recommendations, streaks, XP, revision, share card…). No I/O; unit tested. |
| `src/data/` | SQLite queries, settings, TanStack Query hooks, and the curated JSON data. |
| `src/features/` | One folder per screen. |
| `src-tauri/` | The Rust side: window, tray, reminders, plugins, migrations, the Save dialog for the share card. |
| `scripts/` | Data scripts, link checker, release script. |
| `website/` | The landing page (GitHub Pages). Not part of the app. |

## 8. Where user data lives

Everything is on the user's own computer, in `%APPDATA%\com.algocompass.app\` (for example `C:\Users\<name>\AppData\Roaming\com.algocompass.app\`):

| File | What |
|---|---|
| `algocompass.db` | The SQLite database: synced submissions, profiles, contests, sheet ticks, notes, revisions, virtual contests, friends, badges. While the app runs, recent writes may sit in `algocompass.db-wal` next to it; quit the app before copying. |
| `algocompass-preview.db` | The Debug page's "Preview a profile" sandbox. Safe to delete. |
| `settings.json` | Settings: handles, mode, theme, goals, notifications, Learn history, rating goal. |
| `reminders.json` | Which reminders already fired (so none fires twice). |
| `migration-heal.log` | Only exists if the startup line-ending repair ever ran. |

There is no server and no account. Uninstalling the app does not delete this folder. To start completely fresh, quit the app (also from the tray) and delete the folder.

To inspect the database: `node scripts/inspect-db.mjs` (read-only; prints the applied migrations and the rows per table; pass a path to look at a backup), the hidden Debug page (**Ctrl+Shift+D**, the app's tables row by row), or [DB Browser for SQLite](https://sqlitebrowser.org/) while the app is closed.

## 9. Backups

The app has no built-in backup or sync, so back up the data folder:

```powershell
# Quit AlgoCompass first (right-click the tray icon → Quit), so the database isn't mid-write.
Copy-Item "$env:APPDATA\com.algocompass.app" "$env:USERPROFILE\Desktop\algocompass-backup-$(Get-Date -Format yyyy-MM-dd)" -Recurse
```

To restore: quit the app, delete (or rename) `%APPDATA%\com.algocompass.app`, copy the backup folder back under that exact name, and start the app.

Most data can be rebuilt by syncing again (Codeforces and LeetCode history), but **manual ticks, notes, revision progress, virtual contests, friends and settings exist only in this folder.** Always back it up before testing a new build on real data.

Separately, back up the **signing key and its password** (section 4). They are the one thing that can't be recreated.
