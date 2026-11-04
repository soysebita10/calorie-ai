import { NextResponse } from "next/server";
import { post } from "@/lib/api";
import { getBilling, logBillingError, stripe } from "@/lib/billing";
import { BILLING_USER, billingUserKey, consume } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

// Opens Stripe's hosted page for cancelling or changing the card on file.
export const POST = post(async (request) => {
  const origin = request.headers.get("origin")!;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const user = await getCurrentUser();
  if (!user) return go("/login");

  const limit = await consume(billingUserKey(user.id), BILLING_USER);
  if (!limit.allowed) return go("/dashboard?billing=error");

  try {
    const { customerId } = await getBilling(user.id);
    if (!customerId) return go("/dashboard");

    const session = await stripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/api/billing/return`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    logBillingError("Billing portal failed:", error);
    return go("/dashboard?billing=error");
  }
});
