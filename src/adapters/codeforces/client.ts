import { AdapterError, defaultFetch, fetchFailure, sleep, type FetchLike } from "../http";

const BASE = "https://codeforces.com/api/";

interface CfEnvelope<T> {
  status: "OK" | "FAILED";
  comment?: string;
  result?: T;
}

export interface CfClientOptions {
  fetch?: FetchLike;
  /** Minimum gap between calls. Codeforces allows ~1 call per 2 seconds. */
  minIntervalMs?: number;
  now?: () => number;
}

/**
 * Official Codeforces API client. Calls are serialized through a queue that keeps at least
 * `minIntervalMs` between request starts, and `status: "FAILED"` envelopes become AdapterErrors.
 */
export class CodeforcesClient {
  private readonly fetchImpl: FetchLike;
  private readonly minIntervalMs: number;
  private readonly now: () => number;
  private queue: Promise<unknown> = Promise.resolve();
  private lastCallAt = -Infinity;

  constructor(options: CfClientOptions = {}) {
    this.fetchImpl = options.fetch ?? defaultFetch;
    this.minIntervalMs = options.minIntervalMs ?? 2000;
    this.now = options.now ?? Date.now;
  }

  call<T>(method: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
    const run = async () => {
      const wait = this.lastCallAt + this.minIntervalMs - this.now();
      if (wait > 0) await sleep(wait);
      this.lastCallAt = this.now();
      return this.request<T>(method, params, true);
    };
    const next = this.queue.then(run, run);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async request<T>(
    method: string,
    params: Record<string, string | number | boolean | undefined>,
    retryOnLimit: boolean,
  ): Promise<T> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
    const url = `${BASE}${method}${qs.size ? `?${qs}` : ""}`;

    let res: Response;
    try {
      res = await this.fetchImpl(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch (e) {
      throw fetchFailure("cf", "Codeforces", e);
    }

    let body: CfEnvelope<T>;
    try {
      body = (await res.json()) as CfEnvelope<T>;
    } catch {
      if (res.status === 503 || res.status === 429) {
        throw new AdapterError("cf", "rate-limit", "Codeforces is rate-limiting or temporarily down");
      }
      throw new AdapterError("cf", "parse", `Codeforces returned an unreadable response (HTTP ${res.status})`);
    }

    if (body.status === "OK" && body.result !== undefined) return body.result;

    const comment = body.comment ?? `HTTP ${res.status}`;
    if (/call limit exceeded/i.test(comment)) {
      if (retryOnLimit) {
        await sleep(this.minIntervalMs * 1.5);
        this.lastCallAt = this.now();
        return this.request<T>(method, params, false);
      }
      throw new AdapterError("cf", "rate-limit", "Codeforces call limit exceeded");
    }
    if (/not found/i.test(comment)) throw new AdapterError("cf", "not-found", comment);
    throw new AdapterError("cf", "api", `Codeforces: ${comment}`);
  }
}
