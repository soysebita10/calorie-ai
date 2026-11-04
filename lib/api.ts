import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** Rejects cross-site POSTs (CSRF). Browsers always send Origin on POST. */
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Handler = (request: Request) => Promise<Response>;

/** Wraps a POST handler with the same-origin check and safe error handling. */
export function post(handler: Handler): Handler {
  return async (request) => {
    if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
    try {
      return await handler(request);
    } catch (error) {
      console.error(error);
      return jsonError("Something went wrong. Please try again.", 500);
    }
  };
}

/** Parses a JSON object body; returns {} for anything malformed. */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}
