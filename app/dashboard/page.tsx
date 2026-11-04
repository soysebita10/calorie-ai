import type { Metadata } from "next";
import { GoalForm } from "@/components/GoalForm";
import { MealTracker } from "@/components/MealTracker";
import { PlanCard } from "@/components/PlanCard";
import { AppHeader, SiteFooter } from "@/components/SiteChrome";
import { getBilling, isStripeTestMode } from "@/lib/billing";
import { sql } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard — CalorieAI" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>;
}) {
  const user = await requireUser();
  const { billing: notice } = await searchParams;
  const billing = await getBilling(user.id);

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

          <PlanCard
            billing={billing}
            notice={typeof notice === "string" ? notice : undefined}
            testMode={isStripeTestMode()}
          />

          <MealTracker goal={dailyCalories} />

          <div className="feature-grid dashboard-grid dashboard-grid-two">
            <section className="feature-card">
              <h2>Daily calorie goal</h2>
              <p>Saved privately to your account.</p>
              <GoalForm initialGoal={dailyCalories} />
            </section>

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
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
