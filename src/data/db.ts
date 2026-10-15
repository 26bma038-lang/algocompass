import { isTauri } from "@tauri-apps/api/core";
import migration0001 from "../../src-tauri/migrations/0001_init.sql?raw";
import migration0002 from "../../src-tauri/migrations/0002_lc_problems.sql?raw";
import migration0003 from "../../src-tauri/migrations/0003_recommender.sql?raw";
import migration0004 from "../../src-tauri/migrations/0004_quests.sql?raw";
import migration0005 from "../../src-tauri/migrations/0005_achievements.sql?raw";

/** Must match `DB_URL` in src-tauri/src/lib.rs (where the Rust side runs migrations). */
export const DB_URL = "sqlite:algocompass.db";

/** All SQL in the app uses `$1, $2, …` placeholders in order of appearance. */
export type SqlValue = string | number | null;

export interface SqlDriver {
  execute(sql: string, params?: SqlValue[]): Promise<void>;
  select<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

export const MIGRATIONS = [migration0001, migration0002, migration0003, migration0004, migration0005];

async function tauriDriver(): Promise<SqlDriver> {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const db = await Database.load(DB_URL); // runs Rust-side migrations
  return {
    execute: async (sql, params = []) => {
      await db.execute(sql, params);
    },
    select: (sql, params = []) => db.select(sql, params),
  };
}

/** sql.js (WASM SQLite) driver: browser dev outside Tauri (in-memory) and unit tests. */
export function sqlJsDriver(db: import("sql.js").Database): SqlDriver {
  return {
    execute: async (sql, params = []) => {
      db.run(sql, params);
    },
    select: async <T>(sql: string, params: SqlValue[] = []) => {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
  };
}

async function browserDriver(): Promise<SqlDriver> {
  const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
    import("sql.js"),
    import("sql.js/dist/sql-wasm.wasm?url"),
  ]);
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();
  for (const m of MIGRATIONS) db.exec(m);
  return sqlJsDriver(db);
}

let driver: Promise<SqlDriver> | null = null;

/** The app database: SQLite file via tauri-plugin-sql, or an in-memory sql.js DB in a plain browser. */
export function getDb(): Promise<SqlDriver> {
  // `tauri build` sets TAURI_ENV_PLATFORM, so this folds to tauriDriver() and sql.js (with its 650 kB
  // WASM) is left out of the desktop bundle. Plain `vite` keeps the browser driver for dev.
  driver ??= import.meta.env.TAURI_ENV_PLATFORM ? tauriDriver() : isTauri() ? tauriDriver() : browserDriver();
  return driver;
}
