import { getBilling, logBillingError, stripe, syncSubscription } from "@/lib/billing";
import { getCurrentUser } from "@/lib/session";

const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });

/**
 * Where Stripe sends people back to, after Checkout (with session_id) or the
 * billing portal (without). Refreshing here means the plan is right immediately,
 * even if the webhook is late or can't reach this deployment, as on Preview.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return go("/login");

  const sessionId = new URL(request.url).searchParams.get("session_id");
  try {
    if (!sessionId) {
      const { subscriptionId } = await getBilling(user.id);
      if (subscriptionId) await syncSubscription(subscriptionId);
      return go("/dashboard");
    }

    const session = await stripe().checkout.sessions.retrieve(sessionId);
    // Only the account that started this checkout may use its result.
    if (session.client_reference_id !== String(user.id) || session.status !== "complete") {
      return go("/dashboard?billing=error");
    }
    const subscription = session.subscription;
    if (!subscription) return go("/dashboard?billing=pending");

    await syncSubscription(typeof subscription === "string" ? subscription : subscription.id);
    return go("/dashboard?billing=success");
  } catch (error) {
    logBillingError("Billing return failed:", error);
    return go(sessionId ? "/dashboard?billing=pending" : "/dashboard");
  }
}
