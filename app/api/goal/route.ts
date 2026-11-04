import { NextResponse } from "next/server";
import { jsonError, post, readBody } from "@/lib/api";
import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CALORIES_MAX, CALORIES_MIN } from "@/lib/validation";

export const POST = post(async (request) => {
  // The owner always comes from the session; any user id in the body is ignored.
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  const { dailyCalories } = await readBody(request);
  if (
    !Number.isInteger(dailyCalories) ||
    (dailyCalories as number) < CALORIES_MIN ||
    (dailyCalories as number) > CALORIES_MAX
  ) {
    return jsonError(`Enter a whole number from ${CALORIES_MIN} to ${CALORIES_MAX}.`, 400);
  }

  await sql()`
    INSERT INTO nutrition_goals (user_id, daily_calories)
    VALUES (${user.id}, ${dailyCalories as number})
    ON CONFLICT (user_id)
    DO UPDATE SET daily_calories = EXCLUDED.daily_calories, updated_at = now()
  `;
  return NextResponse.json({ ok: true, dailyCalories });
});
