import { NextResponse } from "next/server";
import { jsonError, post } from "@/lib/api";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

/** Deletes a meal only if it belongs to the logged-in user. */
export const DELETE = post<Context>(async (_request, { params }) => {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) return jsonError("Meal not found.", 404);

  const rows = await sql()`
    DELETE FROM meals WHERE id = ${id} AND user_id = ${user.id} RETURNING id
  `;
  if (rows.length === 0) return jsonError("Meal not found.", 404);
  return NextResponse.json({ ok: true });
});
