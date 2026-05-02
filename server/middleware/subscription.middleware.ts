import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions, plans } from "@shared/schema";
import { eq, and, desc, gt, or } from "drizzle-orm";
import { differenceInDays } from "date-fns";

// ── Shared helper: get active plan for an admin ───────────────────────────────
export async function getPlanLimits(adminId: number) {
  const [sub] = await db
    .select({ plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, adminId), eq(subscriptions.status, "active")))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return sub?.plan ?? null;
}

// ── Check subscription validity for every request ─────────────────────────────
export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const userRole = (req.session as any)?.userRole;

  // SuperAdmin bypass — no subscription needed
  if (userRole === "superadmin") return next();

  // Sub-users inherit their admin's subscription
  const adminId = (req.session as any)?.adminId;
  const effectiveId = adminId ?? userId;

  // Get latest active subscription
  const [sub] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(eq(subscriptions.userId, effectiveId), eq(subscriptions.status, "active")),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!sub) {
    return res.status(402).json({
      code: "NO_SUBSCRIPTION",
      message: "No active subscription found. Please subscribe to continue.",
    });
  }

  const now = new Date();
  const endDate = new Date(sub.subscription.endDate);

  // Check if expired
  if (endDate < now) {
    // Mark as expired
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(eq(subscriptions.id, sub.subscription.id));

    return res.status(402).json({
      code: "SUBSCRIPTION_EXPIRED",
      message: "Your subscription has expired. Please renew to continue.",
    });
  }

  // Attach subscription info to request
  (req as any).subscription = sub;
  next();
}

// ── Get subscription status (for frontend) ────────────────────────────────────
export async function getSubscriptionStatus(userId: number) {
  // Query active OR recently-expired subscriptions (covers DB-marked "expired" status)
  const [sub] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "expired")),
      ),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  // Check if user has ever used a free plan (for preventing re-use)
  const [freeTrialRow] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.userId, userId), eq(plans.monthlyPrice, 0), eq(plans.yearlyPrice, 0)))
    .limit(1);
  const usedFreeTrial = !!freeTrialRow;

  if (!sub) return { status: "none", daysLeft: 0, plan: null, usedFreeTrial };

  const now = new Date();
  const endDate = new Date(sub.subscription.endDate);
  const daysLeft = Math.max(0, differenceInDays(endDate, now));

  if (endDate < now || sub.subscription.status === "expired") {
    return { status: "expired", daysLeft: 0, plan: sub.plan, endDate: sub.subscription.endDate, usedFreeTrial };
  }

  return {
    status: daysLeft <= 5 ? "expiring_soon" : "active",
    daysLeft,
    plan: sub.plan,
    subscription: sub.subscription,
    endDate: sub.subscription.endDate,
    usedFreeTrial,
  };
}

// ── Subscription status endpoint ──────────────────────────────────────────────
export async function subscriptionStatusHandler(req: Request, res: Response) {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const userRole = (req.session as any)?.userRole;
  if (userRole === "superadmin") {
    return res.json({ status: "superadmin", daysLeft: 999, plan: null });
  }

  // Sub-users (staff/teacher/accountant) inherit their admin's subscription
  const adminId = (req.session as any)?.adminId;
  const effectiveId = adminId ?? userId;

  const status = await getSubscriptionStatus(effectiveId);
  res.json(status);
}
