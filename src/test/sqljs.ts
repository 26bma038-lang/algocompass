import initSqlJs from "sql.js";
import { MIGRATIONS, sqlJsDriver } from "@/data/db";
import { Repo } from "@/data/repo";

/** Fresh in-memory SQLite (real schema) for tests. */
export async function memoryRepo(): Promise<Repo> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  for (const m of MIGRATIONS) db.exec(m);
  return new Repo(sqlJsDriver(db));
}

/** Builds a fetch stub that answers by URL/body matcher. */
export function stubFetch(handler: (url: string, init?: RequestInit) => unknown | Response) {
  const calls: { url: string; init?: RequestInit; at: number }[] = [];
  const fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init, at: Date.now() });
    const out = handler(url, init);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  };
  return { fetch, calls };
}
