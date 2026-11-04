import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import {
  getBilling,
  getOrCreateCustomer,
  logBillingError,
  stripe,
  syncSubscription,
} from "@/lib/billing";
import { BILLING_USER, billingUserKey, consume } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

// Posted by a plain HTML form, so every outcome is a redirect.
export const POST = post(async (request) => {
  const origin = request.headers.get("origin")!;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const user = await getCurrentUser();
  if (!user) return go("/login");

  const limit = await consume(billingUserKey(user.id), BILLING_USER);
  if (!limit.allowed) return go("/dashboard?billing=error");

  try {
    if ((await getBilling(user.id)).premium) return go("/dashboard");

    const customer = await getOrCreateCustomer(user);

    // Already paid but our database missed it: fix that instead of charging twice.
    const active = await stripe().subscriptions.list({ customer, status: "active", limit: 1 });
    if (active.data[0]) {
      await syncSubscription(active.data[0].id);
      return go("/dashboard?billing=success");
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) throw new Error("STRIPE_PRICE_ID is not set");

    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: String(user.id),
      integration_identifier: "calorieai-premium-qkvzmtrw",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: { user_id: String(user.id) } },
      success_url: `${origin}/api/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?billing=cancelled`,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    logBillingError("Checkout failed:", error);
    return go("/dashboard?billing=error");
  }
});
