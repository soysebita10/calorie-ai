"use client";

import { useState, type FormEvent } from "react";

export function GoalForm({ initialGoal }: { initialGoal: number | null }) {
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setPending(true);

    const dailyCalories = Number(new FormData(event.currentTarget).get("dailyCalories"));
    try {
      const response = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCalories }),
      });
      const data = await response.json().catch(() => null);
      setStatus(
        response.ok
          ? { ok: true, message: "Goal saved to your account." }
          : { ok: false, message: data?.error ?? "Couldn't save your goal." },
      );
    } catch {
      setStatus({ ok: false, message: "Couldn't reach the server. Please try again." });
    }
    setPending(false);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Calories per day</span>
        <input
          name="dailyCalories"
          type="number"
          min={800}
          max={10000}
          step={1}
          defaultValue={initialGoal ?? undefined}
          placeholder="e.g. 2000"
          required
        />
      </label>
      {status && (
        <p className={status.ok ? "form-success" : "form-error"} role="status">
          {status.message}
        </p>
      )}
      <button type="submit" className="btn btn-small form-submit" disabled={pending}>
        {pending ? "Saving…" : "Save goal"}
      </button>
    </form>
  );
}
