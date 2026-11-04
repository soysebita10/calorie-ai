export const MAX_ITEMS = 30;
export const MAX_ITEM_CALORIES = 20000;
export const MAX_ITEM_MACRO_GRAMS = 2000;
export const MAX_DESCRIPTION_LENGTH = 1000;

export type MealItem = {
  name: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Totals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export type Meal = Totals & {
  id: string;
  name: string;
  source: "photo" | "text";
  items: MealItem[];
  eaten_on: string;
};

export type MealInput = Omit<Meal, "id">;

const round1 = (value: number) => Math.round(value * 10) / 10;

function isInRange(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
}

/** Totals always come from the items, so the two can never disagree. */
export function sumItems(items: MealItem[]): Totals {
  return {
    calories: Math.round(items.reduce((sum, item) => sum + item.calories, 0)),
    protein_g: round1(items.reduce((sum, item) => sum + item.protein_g, 0)),
    carbs_g: round1(items.reduce((sum, item) => sum + item.carbs_g, 0)),
    fat_g: round1(items.reduce((sum, item) => sum + item.fat_g, 0)),
  };
}

/** Validates one food line, from the AI or from the edit form. */
export function parseItem(value: unknown): MealItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name.trim() : "";
  const portion = typeof item.portion === "string" ? item.portion.trim() : "";
  if (name.length < 1 || name.length > 100 || portion.length > 100) return null;
  if (!isInRange(item.calories, MAX_ITEM_CALORIES)) return null;
  if (
    !isInRange(item.protein_g, MAX_ITEM_MACRO_GRAMS) ||
    !isInRange(item.carbs_g, MAX_ITEM_MACRO_GRAMS) ||
    !isInRange(item.fat_g, MAX_ITEM_MACRO_GRAMS)
  ) {
    return null;
  }
  return {
    name,
    portion,
    calories: Math.round(item.calories),
    protein_g: round1(item.protein_g),
    carbs_g: round1(item.carbs_g),
    fat_g: round1(item.fat_g),
  };
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  // One day ahead of UTC allows for users in time zones ahead of it.
  return value >= "2000-01-01" && parsed.getTime() <= Date.now() + 2 * 24 * 60 * 60 * 1000;
}

/** Checks a meal sent by the edit form. The owner is never part of this input. */
export function parseMealInput(body: Record<string, unknown>): MealInput | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 200) {
    return { error: "Enter a meal name (200 characters at most)." };
  }
  if (body.source !== "photo" && body.source !== "text") {
    return { error: "Unknown meal source." };
  }
  if (!isValidDate(body.eatenOn)) return { error: "Enter a valid date." };
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_ITEMS) {
    return { error: `A meal needs between 1 and ${MAX_ITEMS} food items.` };
  }

  const items = body.items.map(parseItem);
  if (items.some((item) => item === null)) {
    return {
      error: `Each food needs a name, with calories up to ${MAX_ITEM_CALORIES} and macros up to ${MAX_ITEM_MACRO_GRAMS}g.`,
    };
  }

  const validItems = items as MealItem[];
  const totals = sumItems(validItems);
  if (totals.calories > MAX_ITEM_CALORIES) {
    return { error: `A meal can't be more than ${MAX_ITEM_CALORIES} calories.` };
  }
  return { name, source: body.source, items: validItems, eaten_on: body.eatenOn, ...totals };
}

const IMAGE_SIGNATURES = {
  "image/jpeg": (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b: Uint8Array) =>
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  "image/webp": (b: Uint8Array) =>
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
} as const;

export type ImageType = keyof typeof IMAGE_SIGNATURES;

/** Identifies an image from its bytes, not from what the upload claims to be. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  for (const type of Object.keys(IMAGE_SIGNATURES) as ImageType[]) {
    if (IMAGE_SIGNATURES[type](bytes)) return type;
  }
  return null;
}
