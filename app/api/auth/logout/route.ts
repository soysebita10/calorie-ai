import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import { destroySession } from "@/lib/session";

// Posted by a plain HTML form, so it answers with a redirect to the homepage.
export const POST = post(async (request) => {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.headers.get("origin")!), 303);
});
