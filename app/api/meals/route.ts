import { NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai";
import { jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { isValidDate, parseMealInput } from "@/lib/meals";
import { getCurrentUser } from "@/lib/session";

/** One day's meals and totals, plus recent days for the history list. */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonError("Please log in.", 401);

    const date = new URL(request.url).searchParams.get("date");
    if (!isValidDate(date)) return jsonError("Enter a valid date.", 400);

    const [meals, recentDays] = await Promise.all([
      sql()`
        SELECT id, name, source, items, eaten_on::text AS eaten_on, calories,
               protein_g::float8 AS protein_g, carbs_g::float8 AS carbs_g, fat_g::float8 AS fat_g
        FROM meals
        WHERE user_id = ${user.id} AND eaten_on = ${date}
        ORDER BY created_at DESC, id DESC
      `,
      sql()`
        SELECT eaten_on::text AS eaten_on, count(*)::int AS meal_count,
               sum(calories)::int AS calories,
               sum(protein_g)::float8 AS protein_g,
               sum(carbs_g)::float8 AS carbs_g,
               sum(fat_g)::float8 AS fat_g
        FROM meals
        WHERE user_id = ${user.id}
        GROUP BY eaten_on
        ORDER BY eaten_on DESC
        LIMIT 14
      `,
    ]);

    return NextResponse.json({ date, meals, recentDays });
  } catch (error) {
    console.error(error);
    return jsonError("Something went wrong. Please try again.", 500);
  }
}

/** Saves a reviewed meal under the logged-in user. */
export const POST = post(async (request) => {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const meal = parseMealInput(await readBody(request));
  if ("error" in meal) return jsonError(meal.error, 400);

  const rows = await sql()`
    INSERT INTO meals (user_id, name, source, items, calories, protein_g, carbs_g, fat_g, eaten_on, ai_model)
    VALUES (${user.id}, ${meal.name}, ${meal.source}, ${JSON.stringify(meal.items)}::jsonb,
            ${meal.calories}, ${meal.protein_g}, ${meal.carbs_g}, ${meal.fat_g}, ${meal.eaten_on}, ${AI_MODEL})
    RETURNING id
  `;
  return NextResponse.json({ ok: true, id: rows[0].id }, { status: 201 });
});
