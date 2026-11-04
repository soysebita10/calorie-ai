import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { jsonError } from "@/lib/api";
import { logBillingError, stripe, syncSubscription } from "@/lib/billing";

/**
 * Called by Stripe, not a browser, so it doesn't use post(): Stripe sends no
 * Origin header. Instead, every request must carry a valid Stripe signature.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook failed: STRIPE_WEBHOOK_SECRET is not set");
    return jsonError("Webhook is not configured.", 500);
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing signature.", 400);

  // The signature covers the exact bytes, so read the body before any parsing.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return jsonError("Invalid signature.", 400);
  }

  try {
    let subscriptionId: string | null = null;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const { subscription } = event.data.object;
        if (subscription) {
          subscriptionId = typeof subscription === "string" ? subscription : subscription.id;
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        subscriptionId = event.data.object.id;
        break;
    }
    if (subscriptionId) await syncSubscription(subscriptionId);
    return NextResponse.json({ received: true });
  } catch (error) {
    // A failure status makes Stripe retry the event later.
    logBillingError(`Stripe webhook ${event.type} failed:`, error);
    return jsonError("Could not process event.", 500);
  }
}
