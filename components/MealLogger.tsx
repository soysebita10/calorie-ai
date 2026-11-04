"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { MealItem } from "@/lib/meals";

export type Draft = {
  name: string;
  source: "photo" | "text";
  items: MealItem[];
  confidence?: "low" | "medium" | "high";
  notes?: string;
  eatenOn: string;
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_LONG_EDGE = 1092; // Larger photos cost more without helping food estimates.

/** Shrinks a photo in the browser, which also converts it to a plain JPEG. */
async function preparePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("no blob");
  return blob;
}

export function MealLogger({
  defaultDate,
  onAnalyzed,
}: {
  defaultDate: string;
  onAnalyzed: (draft: Draft) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(chosen: File | null) {
    setError("");
    if (chosen && !chosen.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setFile(null);
      return;
    }
    if (chosen && chosen.size > MAX_UPLOAD_BYTES) {
      setError("That photo is too large. Please use one under 25 MB.");
      setFile(null);
      return;
    }
    setFile(chosen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!file && !description.trim()) {
      setError("Add a photo or describe your meal.");
      return;
    }
    setPending(true);

    try {
      const form = new FormData();
      form.set("description", description.trim());
      if (file) {
        let photo: Blob;
        try {
          photo = await preparePhoto(file);
        } catch {
          setError("We couldn't read that image. Please use a JPEG, PNG or WebP photo.");
          setPending(false);
          return;
        }
        form.set("image", photo, "meal.jpg");
      }

      const response = await fetch("/api/meals/analyze", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
      onAnalyzed({
        name: data.name,
        source: data.source,
        items: data.items,
        confidence: data.confidence,
        notes: data.notes,
        eatenOn: defaultDate,
      });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h2>Log a meal</h2>
      <p>Upload a food photo, describe what you ate, or both.</p>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Food photo</span>
          <input
            type="file"
            data-testid="meal-photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {previewUrl && <img className="meal-preview" src={previewUrl} alt="Selected meal" />}
        <label className="field">
          <span>Description</span>
          <textarea
            data-testid="meal-description"
            rows={3}
            maxLength={1000}
            value={description}
            placeholder="e.g. two scrambled eggs and a slice of buttered toast"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn form-submit" disabled={pending}>
          {pending ? "Analyzing…" : "Analyze meal"}
        </button>
      </form>
    </>
  );
}

type ItemRow = {
  name: string;
  portion: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
};

const toRow = (item: MealItem): ItemRow => ({
  name: item.name,
  portion: item.portion,
  calories: String(item.calories),
  protein_g: String(item.protein_g),
  carbs_g: String(item.carbs_g),
  fat_g: String(item.fat_g),
});

const NUMBER_FIELDS = [
  ["calories", "Calories"],
  ["protein_g", "Protein (g)"],
  ["carbs_g", "Carbs (g)"],
  ["fat_g", "Fat (g)"],
] as const;

const sum = (rows: ItemRow[], field: (typeof NUMBER_FIELDS)[number][0]) =>
  rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);

/** The AI's estimate, editable before anything is saved. */
export function MealEditor({
  draft,
  onCancel,
  onSaved,
}: {
  draft: Draft;
  onCancel: () => void;
  onSaved: (date: string) => void | Promise<void>;
}) {
  const [name, setName] = useState(draft.name);
  const [eatenOn, setEatenOn] = useState(draft.eatenOn);
  const [rows, setRows] = useState<ItemRow[]>(draft.items.map(toRow));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function updateRow(index: number, field: keyof ItemRow, value: string) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          source: draft.source,
          eatenOn,
          items: rows.map((row) => ({
            name: row.name,
            portion: row.portion,
            calories: Number(row.calories),
            protein_g: Number(row.protein_g),
            carbs_g: Number(row.carbs_g),
            fat_g: Number(row.fat_g),
          })),
        }),
      });
      if (response.ok) {
        await onSaved(eatenOn);
        return;
      }
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Couldn't save this meal. Please try again.");
    } catch {
      setError("Couldn't reach the server. Your estimate is still here, so please try again.");
    }
    setPending(false);
  }

  return (
    <>
      <h2>Review your estimate</h2>
      <p>
        Check the portions and change anything that looks wrong. Nothing is saved until you press Save.
        {draft.confidence ? ` Confidence: ${draft.confidence}.` : ""}
      </p>
      {draft.notes && <p className="estimate-note" data-testid="ai-notes">{draft.notes}</p>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="editor-meta">
          <label className="field">
            <span>Meal name</span>
            <input data-testid="meal-name" value={name} maxLength={200} required onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={eatenOn} required onChange={(e) => setEatenOn(e.target.value)} />
          </label>
        </div>

        {rows.map((row, index) => (
          <fieldset key={index} className="item-row">
            <legend>Food {index + 1}</legend>
            <div className="item-text">
              <label className="field">
                <span>Food</span>
                <input value={row.name} maxLength={100} required onChange={(e) => updateRow(index, "name", e.target.value)} />
              </label>
              <label className="field">
                <span>Estimated portion</span>
                <input value={row.portion} maxLength={100} onChange={(e) => updateRow(index, "portion", e.target.value)} />
              </label>
            </div>
            <div className="item-numbers">
              {NUMBER_FIELDS.map(([field, label]) => (
                <label key={field} className="field">
                  <span>{label}</span>
                  <input
                    type="number"
                    data-testid={`item-${index}-${field}`}
                    min={0}
                    step={field === "calories" ? 1 : 0.1}
                    value={row[field]}
                    required
                    onChange={(e) => updateRow(index, field, e.target.value)}
                  />
                </label>
              ))}
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
              >
                Remove this food
              </button>
            )}
          </fieldset>
        ))}

        <button
          type="button"
          className="link-button"
          onClick={() =>
            setRows((current) => [
              ...current,
              { name: "", portion: "", calories: "0", protein_g: "0", carbs_g: "0", fat_g: "0" },
            ])
          }
        >
          + Add a food
        </button>

        <p className="editor-total" data-testid="draft-total">
          Total: {Math.round(sum(rows, "calories"))} kcal · {sum(rows, "protein_g").toFixed(1)}g protein ·{" "}
          {sum(rows, "carbs_g").toFixed(1)}g carbs · {sum(rows, "fat_g").toFixed(1)}g fat
        </p>

        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="editor-actions">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "Saving…" : "Save meal"}
          </button>
          <button type="button" className="btn btn-outline" disabled={pending} onClick={onCancel}>
            Discard
          </button>
        </div>
      </form>
    </>
  );
}
