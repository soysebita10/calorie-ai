import type { Metadata } from "next";
import { GoalForm } from "@/components/GoalForm";
import { AppHeader, SiteFooter } from "@/components/SiteChrome";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard — CalorieAI" };

export default async function DashboardPage() {
  const user = await requireUser();

  const goals = await sql()`
    SELECT daily_calories FROM nutrition_goals WHERE user_id = ${user.id}
  `;
  const dailyCalories = (goals[0]?.daily_calories as number | undefined) ?? null;

  const memberSince = new Date(user.created_at).toLocaleDateString("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  });

  return (
    <>
      <AppHeader>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="btn btn-outline btn-small">Log out</button>
        </form>
      </AppHeader>

      <main className="dashboard">
        <div className="container">
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome, {user.name}</h1>

          <div className="feature-grid dashboard-grid">
            <section className="feature-card">
              <h2>Your account</h2>
              <dl className="account-details">
                <dt>Name</dt>
                <dd>{user.name}</dd>
                <dt>Email</dt>
                <dd>{user.email}</dd>
                <dt>Member since</dt>
                <dd>{memberSince}</dd>
              </dl>
            </section>

            <section className="feature-card">
              <h2>Daily calorie goal</h2>
              <p>Saved privately to your account.</p>
              <GoalForm initialGoal={dailyCalories} />
            </section>

            <section className="feature-card">
              <h2>Meal logging</h2>
              <p>Photo and text meal logging is coming soon. Your meals will appear here.</p>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
