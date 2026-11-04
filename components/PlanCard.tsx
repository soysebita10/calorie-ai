import type { Billing } from "@/lib/billing";
import { FREE_AI_DAILY, PREMIUM_AI_DAILY, PREMIUM_PRICE_LABEL } from "@/lib/plans";

const NOTICES: Record<string, { text: string; className: string }> = {
  success: { text: "Payment complete. Welcome to Premium!", className: "form-success" },
  pending: { text: "Payment received. Your plan will update in a moment, so please refresh shortly.", className: "form-success" },
  cancelled: { text: "Checkout cancelled. You have not been charged.", className: "form-error" },
  error: { text: "We couldn't open billing just now. Please try again in a few minutes.", className: "form-error" },
};

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });

export function PlanCard({
  billing,
  notice,
  testMode,
}: {
  billing: Billing;
  notice?: string;
  testMode: boolean;
}) {
  const message = notice ? NOTICES[notice] : undefined;
  const pastDue = !billing.premium && (billing.status === "past_due" || billing.status === "unpaid");

  return (
    <section className="feature-card plan-card">
      <div className="plan-card-body">
        <div>
          <h2>
            Your plan: {billing.premium ? "Premium" : "Free"}{" "}
            <span className={billing.premium ? "plan-badge plan-badge-premium" : "plan-badge"}>
              {billing.premium ? PREMIUM_AI_DAILY : FREE_AI_DAILY} AI analyses a day
            </span>
          </h2>
          {billing.comped && <p>Premium access is included with this account.</p>}
          {!billing.comped && billing.premium && billing.periodEnd && (
            <p>
              {billing.cancelScheduled ? "Your subscription ends on " : "Renews on "}
              {formatDate(billing.periodEnd)}.
            </p>
          )}
          {pastDue && <p>Your last payment didn&apos;t go through. Update your card to get Premium back.</p>}
          {!billing.premium && !pastDue && (
            <p>Upgrade to Premium for {PREMIUM_AI_DAILY} AI analyses a day, at {PREMIUM_PRICE_LABEL} a month.</p>
          )}
        </div>

        {!billing.premium && !pastDue && (
          <form action="/api/billing/checkout" method="post">
            <button type="submit" className="btn">Upgrade to Premium</button>
          </form>
        )}
        {!billing.comped && billing.customerId && (billing.premium || pastDue) && (
          <form action="/api/billing/portal" method="post">
            <button type="submit" className="btn btn-outline">Manage subscription</button>
          </form>
        )}
      </div>

      {testMode && !billing.premium && (
        <p className="plan-test-note">
          Test mode: no real money moves. Pay with card 4242 4242 4242 4242, any future expiry date and any CVC.
        </p>
      )}
      {message && <p className={`plan-notice ${message.className}`} role="status">{message.text}</p>}
    </section>
  );
}
