import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | undefined;

/**
 * Neon's HTTP driver: each query is one HTTPS request, so serverless functions
 * never exhaust connections. Created on first use so builds don't need the
 * database URL.
 */
export function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}
