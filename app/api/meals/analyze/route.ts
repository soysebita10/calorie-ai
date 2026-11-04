import { NextResponse } from "next/server";
import { analyzeMeal, AnalysisError } from "@/lib/ai";
import { jsonError, post } from "@/lib/api";
import { detectImageType, type ImageType, MAX_DESCRIPTION_LENGTH } from "@/lib/meals";
import { AI_DAILY, aiUserKey, consume, refund } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

export const maxDuration = 60;

// Vercel rejects request bodies over about 4.5 MB. The browser shrinks photos well below this.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const POST = post(async (request) => {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please log in.", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Add a photo or describe your meal.", 400);
  }

  const rawDescription = form.get("description");
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return jsonError(`Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`, 400);
  }

  const file = form.get("image");
  let image: { type: ImageType; bytes: Uint8Array } | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) {
      return jsonError("That photo is too large. Please use one under 4 MB.", 413);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return jsonError("Please upload a JPEG, PNG or WebP image.", 415);
    image = { type, bytes };
  }

  if (!image && !description) return jsonError("Add a photo or describe your meal.", 400);

  // Checked last, so rejected uploads don't use up the daily allowance.
  const limitKey = aiUserKey(user.id);
  const limit = await consume(limitKey, AI_DAILY);
  if (!limit.allowed) {
    return jsonError(
      `You've reached the limit of ${AI_DAILY.limit} meal analyses for today. You can try again later.`,
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  try {
    const analysis = await analyzeMeal({ image, description });
    return NextResponse.json({ ...analysis, source: image ? "photo" : "text" });
  } catch (error) {
    await refund(limitKey);
    if (error instanceof AnalysisError) return jsonError(error.message, error.status);
    throw error;
  }
});
