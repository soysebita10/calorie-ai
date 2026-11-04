"use client";

import { useState, type FormEvent } from "react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      if (response.ok) {
        window.location.assign("/dashboard");
        return;
      }
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    }
    setPending(false);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {isSignup && (
        <label className="field">
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" maxLength={100} required />
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={isSignup ? 8 : undefined}
          required
        />
        {isSignup && <small>At least 8 characters.</small>}
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn form-submit" disabled={pending}>
        {pending ? "Please wait…" : isSignup ? "Create account" : "Log in"}
      </button>
    </form>
  );
}
