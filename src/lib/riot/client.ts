/**
 * Base HTTP client for Riot API.
 * All calls are server-side only — the API key never reaches the browser.
 */

export class RiotApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export async function riotFetch<T>(url: string): Promise<T> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY is not set");

  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey },
    // Next.js: opt out of data cache — always fetch fresh data
    cache: "no-store",
  });

  if (!res.ok) {
    throw new RiotApiError(res.status, `Riot API ${res.status}: ${url}`);
  }

  return res.json() as Promise<T>;
}
