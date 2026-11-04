"use client";

import { useCallback, useEffect, useState } from "react";
import { MealEditor, MealLogger, type Draft } from "@/components/MealLogger";
import type { Meal, Totals } from "@/lib/meals";

type DaySummary = Totals & { eaten_on: string; meal_count: number };
type DayData = { date: string; meals: Meal[]; recentDays: DaySummary[] };

/** Today in the user's own time zone, as YYYY-MM-DD. */
function localToday() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const formatGrams = (value: number) => `${Math.round(value * 10) / 10}g`;

export function MealTracker({ goal }: { goal: number | null }) {
  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  const [data, setData] = useState<DayData | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  // Set after mounting: the server doesn't know the user's time zone.
  useEffect(() => {
    const value = localToday();
    setToday(value);
    setDate(value);
  }, []);

  const load = useCallback(async (day: string) => {
    if (!day) return;
    try {
      const response = await fetch(`/api/meals?date=${day}`, { cache: "no-store" });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error ?? "Couldn't load your meals.");
        return;
      }
      setError("");
      setData(body);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  async function deleteMeal(meal: Meal) {
    if (!window.confirm(`Delete "${meal.name}"? This can't be undone.`)) return;
    try {
      const response = await fetch(`/api/meals/${meal.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Couldn't delete that meal.");
        return;
      }
      await load(date);
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
  }

  const meals = data?.meals ?? [];
  const totals: Totals = {
    calories: meals.reduce((sum, meal) => sum + meal.calories, 0),
    protein_g: meals.reduce((sum, meal) => sum + meal.protein_g, 0),
    carbs_g: meals.reduce((sum, meal) => sum + meal.carbs_g, 0),
    fat_g: meals.reduce((sum, meal) => sum + meal.fat_g, 0),
  };
  const isToday = date === today;
  const goalPercent = goal ? Math.min(Math.round((totals.calories / goal) * 100), 100) : 0;

  return (
    <div className="tracker">
      <section className="feature-card tracker-summary" aria-label="Daily totals">
        <div className="tracker-summary-head">
          <div>
            <h2>{isToday ? "Today" : date ? formatDate(date) : "Today"}</h2>
            <p className="estimate-note">AI numbers are estimates, not medical advice.</p>
          </div>
          <label className="field tracker-date">
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={today || undefined}
              onChange={(event) => event.target.value && setDate(event.target.value)}
            />
          </label>
        </div>

        <div className="totals">
          <div className="total total-calories">
            <strong data-testid="total-calories">{totals.calories}</strong>
            <span>{goal ? `of ${goal} kcal` : "kcal"}</span>
          </div>
          <div className="total">
            <strong data-testid="total-protein">{formatGrams(totals.protein_g)}</strong>
            <span>Protein</span>
          </div>
          <div className="total">
            <strong data-testid="total-carbs">{formatGrams(totals.carbs_g)}</strong>
            <span>Carbohydrates</span>
          </div>
          <div className="total">
            <strong data-testid="total-fat">{formatGrams(totals.fat_g)}</strong>
            <span>Fats</span>
          </div>
        </div>
        {goal ? (
          <div className="bar" role="progressbar" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Daily calorie goal">
            <span className="fill protein" style={{ width: `${goalPercent}%` }}></span>
          </div>
        ) : null}
      </section>

      <section className="feature-card">
        {draft ? (
          <MealEditor
            draft={draft}
            onCancel={() => setDraft(null)}
            onSaved={async (savedDate) => {
              setDraft(null);
              if (savedDate === date) await load(date);
              else setDate(savedDate);
            }}
          />
        ) : (
          <MealLogger defaultDate={date || today} onAnalyzed={setDraft} />
        )}
      </section>

      <div className="form tracker-error-slot">
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>

      <section className="feature-card" aria-label="Meals">
        <h2>Meals</h2>
        {meals.length === 0 ? (
          <p>{data ? "No meals logged for this day yet." : "Loading your meals…"}</p>
        ) : (
          <ul className="meal-list">
            {meals.map((meal) => (
              <li key={meal.id} className="meal">
                <div className="meal-head">
                  <div>
                    <h3>{meal.name}</h3>
                    <p>
                      {meal.calories} kcal · {formatGrams(meal.protein_g)} protein ·{" "}
                      {formatGrams(meal.carbs_g)} carbs · {formatGrams(meal.fat_g)} fat
                    </p>
                  </div>
                  <button type="button" className="btn btn-outline btn-small" onClick={() => deleteMeal(meal)}>
                    Delete
                  </button>
                </div>
                <details>
                  <summary>Portions</summary>
                  <ul className="meal-items">
                    {meal.items.map((item, index) => (
                      <li key={index}>
                        <strong>{item.name}</strong>
                        {item.portion ? ` (${item.portion})` : ""}: {item.calories} kcal,{" "}
                        {formatGrams(item.protein_g)} protein, {formatGrams(item.carbs_g)} carbs,{" "}
                        {formatGrams(item.fat_g)} fat
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data && data.recentDays.length > 0 && (
        <section className="feature-card" aria-label="History">
          <h2>History</h2>
          <ul className="history-list">
            {data.recentDays.map((day) => (
              <li key={day.eaten_on}>
                <button
                  type="button"
                  className={day.eaten_on === date ? "history-day is-selected" : "history-day"}
                  onClick={() => setDate(day.eaten_on)}
                >
                  <span className="history-date">{formatDate(day.eaten_on)}</span>
                  <span>
                    {day.calories} kcal · {day.meal_count} meal{day.meal_count === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
