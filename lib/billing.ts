import Stripe from "stripe";
import { sql } from "@/lib/db";

let client: Stripe | undefined;

/** Created on first use, so the app runs and builds without Stripe keys. */
export function stripe() {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, { timeout: 20_000 });
  }
  return client;
}

export const isStripeTestMode = () => /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");

export type Billing = {
  premium: boolean;
  /** Premium granted directly, with no Stripe subscription (the demo account). */
  comped: boolean;
  status: string | null;
  periodEnd: Date | null;
  cancelScheduled: boolean;
  customerId: string | null;
  subscriptionId: string | null;
};

const ACTIVE_STATUSES = ["active", "trialing"];

/** Reads only the database, so a Stripe outage can't affect the rest of the app. */
export async function getBilling(userId: string): Promise<Billing> {
  const rows = await sql()`
    SELECT comped, status, period_end, cancel_scheduled, stripe_customer_id, stripe_subscription_id
    FROM subscriptions WHERE user_id = ${userId}
  `;
  const row = rows[0];
  const comped = row?.comped === true;
  const status = (row?.status as string | null | undefined) ?? null;
  return {
    premium: comped || (status !== null && ACTIVE_STATUSES.includes(status)),
    comped,
    status,
    periodEnd: row?.period_end ? new Date(row.period_end as string) : null,
    cancelScheduled: row?.cancel_scheduled === true,
    customerId: (row?.stripe_customer_id as string | null | undefined) ?? null,
    subscriptionId: (row?.stripe_subscription_id as string | null | undefined) ?? null,
  };
}

/** The user's Stripe customer, created the first time they start a checkout. */
export async function getOrCreateCustomer(user: { id: string; email: string; name: string }) {
  const existing = await getBilling(user.id);
  if (existing.customerId) return existing.customerId;

  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { user_id: String(user.id) },
  });
  // If two requests race, both keep the first customer that was saved.
  const rows = await sql()`
    INSERT INTO subscriptions (user_id, stripe_customer_id)
    VALUES (${user.id}, ${customer.id})
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = COALESCE(subscriptions.stripe_customer_id, EXCLUDED.stripe_customer_id),
      updated_at = now()
    RETURNING stripe_customer_id
  `;
  return rows[0].stripe_customer_id as string;
}

/**
 * Copies a subscription's current state from Stripe into the database. It always
 * re-reads from Stripe instead of trusting an event's contents, so events that
 * arrive late, twice or out of order still end with the correct state.
 */
export async function syncSubscription(subscriptionId: string) {
  const subscription = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // The customer is saved before checkout starts, so it normally identifies the user.
  const rows = await sql()`SELECT user_id FROM subscriptions WHERE stripe_customer_id = ${customerId}`;
  const metadataUserId = subscription.metadata.user_id;
  const userId =
    (rows[0]?.user_id as string | undefined) ??
    (/^\d+$/.test(metadataUserId ?? "") ? metadataUserId : undefined);
  if (!userId) {
    console.warn("Stripe subscription has no matching user:", subscription.id);
    return;
  }

  const periodEndSeconds = subscription.cancel_at ?? subscription.items.data[0]?.current_period_end;
  const periodEnd = periodEndSeconds ? new Date(periodEndSeconds * 1000).toISOString() : null;
  const cancelScheduled = subscription.cancel_at_period_end || subscription.cancel_at !== null;

  // Events about an older, ended subscription must not overwrite a newer one.
  // Selecting from users skips accounts that have since been deleted.
  await sql()`
    INSERT INTO subscriptions (
      user_id, stripe_customer_id, stripe_subscription_id, status, period_end, cancel_scheduled
    )
    SELECT id, ${customerId}::text, ${subscription.id}::text, ${subscription.status}::text,
      ${periodEnd}::timestamptz, ${cancelScheduled}::boolean
    FROM users WHERE id = ${userId}
    ON CONFLICT (user_id) DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      status = EXCLUDED.status,
      period_end = EXCLUDED.period_end,
      cancel_scheduled = EXCLUDED.cancel_scheduled,
      updated_at = now()
    WHERE subscriptions.stripe_subscription_id IS NULL
      OR subscriptions.stripe_subscription_id = EXCLUDED.stripe_subscription_id
      OR EXCLUDED.status IN ('active', 'trialing')
  `;
}

/** Logs what went wrong with a Stripe call, never the request contents or keys. */
export function logBillingError(context: string, error: unknown) {
  if (error instanceof Stripe.errors.StripeError) {
    console.error(context, {
      type: error.type,
      code: error.code,
      requestId: error.requestId,
      message: error.message,
    });
  } else {
    console.error(context, error instanceof Error ? error.message : "unknown");
  }
}
