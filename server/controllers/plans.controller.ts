import type { Request, Response } from "express";
import { db } from "../db";
import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { plans, subscriptions, payments, users, organizations } from "@shared/schema";
import {
  createOrder,
  createRazorpaySubscription,
  createRazorpayPlan,
  verifyPaymentSignature,
  verifyWebhookSignature,
  cancelRazorpaySubscription,
} from "../utils/razorpay.service";
import { addDays, addMonths, addYears } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// PLANS CONTROLLER (SuperAdmin only)
// ─────────────────────────────────────────────────────────────────────────────
export const PlansController = {
  async list(req: Request, res: Response) {
    const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
    res.json(allPlans);
  },

  async create(req: Request, res: Response) {
    try {
      const schema = z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        monthlyPrice: z.coerce.number().default(0),
        yearlyPrice: z.coerce.number().default(0),
        validityDays: z.coerce.number().optional().nullable(),
        features: z.array(z.string()).default([]),
        maxStudents: z.coerce.number().default(50),
        maxBranches: z.coerce.number().default(1),
        maxStaff: z.coerce.number().default(5),
        isActive: z.boolean().default(true),
        isFeatured: z.boolean().default(false),
        sortOrder: z.coerce.number().default(0),
      });
      const input = schema.parse(req.body);

      // Create Razorpay plans for recurring billing
      let razorpayMonthlyPlanId = null;
      let razorpayYearlyPlanId = null;

      if (input.monthlyPrice > 0) {
        try {
          const rzpMonthly = await createRazorpayPlan({
            name: `${input.name} - Monthly`,
            amount: input.monthlyPrice * 100, // convert to paise
            interval: 1,
            period: "monthly",
          });
          razorpayMonthlyPlanId = rzpMonthly.id;
        } catch (e) {
          console.error("[Plans] Razorpay monthly plan creation failed:", e);
        }
      }

      if (input.yearlyPrice > 0) {
        try {
          const rzpYearly = await createRazorpayPlan({
            name: `${input.name} - Yearly`,
            amount: input.yearlyPrice * 100,
            interval: 1,
            period: "yearly",
          });
          razorpayYearlyPlanId = rzpYearly.id;
        } catch (e) {
          console.error("[Plans] Razorpay yearly plan creation failed:", e);
        }
      }

      const [plan] = await db
        .insert(plans)
        .values({
          ...input,
          razorpayMonthlyPlanId,
          razorpayYearlyPlanId,
        })
        .returning();
      res.status(201).json(plan);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const schema = z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        monthlyPrice: z.coerce.number().optional(),
        yearlyPrice: z.coerce.number().optional(),
        validityDays: z.coerce.number().optional().nullable(),
        features: z.array(z.string()).optional(),
        maxStudents: z.coerce.number().optional(),
        maxBranches: z.coerce.number().optional(),
        maxStaff: z.coerce.number().optional(),
        isActive: z.boolean().optional(),
        isFeatured: z.boolean().optional(),
        sortOrder: z.coerce.number().optional(),
      });
      const input = schema.parse(req.body);
      const [updated] = await db
        .update(plans)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(plans.id, id))
        .returning();
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  async remove(req: Request, res: Response) {
    await db.delete(plans).where(eq(plans.id, Number(req.params.id)));
    res.status(204).send();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION CONTROLLER
// ─────────────────────────────────────────────────────────────────────────────
export const SubscriptionController = {
  // Get current user's subscription
  async getMine(req: Request, res: Response) {
    const userId = (req.session as any).userId;
    const [sub] = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    res.json(sub || null);
  },

  // Create Razorpay order for one-time payment
  async createOrder(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;
      const schema = z.object({
        planId: z.coerce.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
        autoRenew: z.boolean().default(false),
      });
      const { planId, billingCycle, autoRenew } = schema.parse(req.body);

      const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const amount =
        billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
      if (amount === 0) {
        // Free plan — activate directly
        return SubscriptionController._activateFree(req, res, userId, plan);
      }

      // Create Razorpay order
      const order = await createOrder({
        amount: amount * 100, // paise
        receipt: `order_${userId}_${Date.now()}`,
        notes: {
          userId: String(userId),
          planId: String(planId),
          billingCycle,
        },
      });

      // Save pending payment
      await db.insert(payments).values({
        userId,
        planId,
        amount: amount * 100,
        status: "pending",
        razorpayOrderId: order.id,
        billingCycle,
        description: `${plan.name} - ${billingCycle}`,
      });

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        billingCycle,
      });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  // Create Razorpay Subscription (auto-debit)
  async createAutoSubscription(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;
      const schema = z.object({
        planId: z.coerce.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
      });
      const { planId, billingCycle } = schema.parse(req.body);

      const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const rzpPlanId =
        billingCycle === "yearly"
          ? plan.razorpayYearlyPlanId
          : plan.razorpayMonthlyPlanId;

      if (!rzpPlanId) {
        return res
          .status(400)
          .json({ message: "Auto-debit not configured for this plan" });
      }

      const rzpSub = await createRazorpaySubscription({
        planId: rzpPlanId,
        totalCount: billingCycle === "yearly" ? 10 : 120,
        notes: { userId: String(userId), planId: String(planId) },
      });

      res.json({
        subscriptionId: rzpSub.id,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
        billingCycle,
      });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  // Verify payment and activate subscription
  async verifyPayment(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;
      const schema = z.object({
        razorpayOrderId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        planId: z.coerce.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
        autoRenew: z.boolean().default(false),
      });
      const input = schema.parse(req.body);

      // Verify signature
      const isValid = verifyPaymentSignature({
        orderId: input.razorpayOrderId,
        paymentId: input.razorpayPaymentId,
        signature: input.razorpaySignature,
      });

      if (!isValid) {
        return res
          .status(400)
          .json({ message: "Payment verification failed. Invalid signature." });
      }

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      // Calculate end date
      const startDate = new Date();
      let endDate: Date;
      if (input.billingCycle === "yearly") {
        endDate = addYears(startDate, 1);
      } else if (plan.validityDays) {
        endDate = addDays(startDate, plan.validityDays);
      } else {
        endDate = addMonths(startDate, 1);
      }

      // Cancel existing subscription if any
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active"),
          ),
        );
      if (existing) {
        await db
          .update(subscriptions)
          .set({ status: "cancelled", cancelledAt: new Date() })
          .where(eq(subscriptions.id, existing.id));
      }

      // Create new subscription
      const [sub] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId: input.planId,
          billingCycle: input.billingCycle,
          status: "active",
          startDate,
          endDate,
          autoRenew: input.autoRenew,
        })
        .returning();

      // Update payment record
      await db
        .update(payments)
        .set({
          status: "captured",
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          subscriptionId: sub.id,
          paidAt: new Date(),
        })
        .where(eq(payments.razorpayOrderId, input.razorpayOrderId));

      res.json({ success: true, subscription: sub });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  // Verify auto-subscription payment
  async verifyAutoPayment(req: Request, res: Response) {
    try {
      const userId = (req.session as any).userId;
      const schema = z.object({
        razorpaySubscriptionId: z.string(),
        razorpayPaymentId: z.string(),
        razorpaySignature: z.string(),
        planId: z.coerce.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
      });
      const input = schema.parse(req.body);

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const startDate = new Date();
      const endDate =
        input.billingCycle === "yearly"
          ? addYears(startDate, 1)
          : addMonths(startDate, 1);

      // Cancel existing
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(
          and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, "active"),
          ),
        );

      const [sub] = await db
        .insert(subscriptions)
        .values({
          userId,
          planId: input.planId,
          billingCycle: input.billingCycle,
          status: "active",
          startDate,
          endDate,
          razorpaySubId: input.razorpaySubscriptionId,
          autoRenew: true,
        })
        .returning();

      res.json({ success: true, subscription: sub });
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  // Razorpay Webhook (auto-debit events)
  async webhook(req: Request, res: Response) {
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    if (!verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body;
    console.log(`[Webhook] Event: ${event.event}`);

    if (event.event === "subscription.charged") {
      const sub = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;

      // Find subscription by razorpay sub id
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.razorpaySubId, sub.id));

      if (existingSub) {
        // Extend subscription
        const newEndDate =
          existingSub.billingCycle === "yearly"
            ? addYears(new Date(existingSub.endDate), 1)
            : addMonths(new Date(existingSub.endDate), 1);

        await db
          .update(subscriptions)
          .set({ endDate: newEndDate, status: "active", updatedAt: new Date() })
          .where(eq(subscriptions.id, existingSub.id));

        // Log payment
        await db.insert(payments).values({
          subscriptionId: existingSub.id,
          userId: existingSub.userId,
          planId: existingSub.planId,
          amount: payment.amount,
          status: "captured",
          razorpayPaymentId: payment.id,
          billingCycle: existingSub.billingCycle,
          description: "Auto-renewal payment",
          paidAt: new Date(),
        });
      }
    }

    if (event.event === "subscription.cancelled") {
      const sub = event.payload.subscription.entity;
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date() })
        .where(eq(subscriptions.razorpaySubId, sub.id));
    }

    res.json({ received: true });
  },

  // ── Private: Activate free plan ───────────────────────────────────────────
  async _activateFree(req: Request, res: Response, userId: number, plan: any) {
    // Prevent re-use of free plan
    const [existingFreeSub] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.userId, userId), eq(plans.monthlyPrice, 0), eq(plans.yearlyPrice, 0)))
      .limit(1);
    if (existingFreeSub) {
      return res.status(400).json({ message: "You have already used your free trial. Please choose a paid plan." });
    }

    const startDate = new Date();
    const endDate = plan.validityDays
      ? addDays(startDate, plan.validityDays)
      : addYears(startDate, 100); // lifetime for truly free

    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: plan.id,
        billingCycle: "lifetime",
        status: "active",
        startDate,
        endDate,
        autoRenew: false,
      })
      .returning();

    return res.status(201).json({ success: true, subscription: sub });
  },

  // Cancel subscription
  async cancel(req: Request, res: Response) {
    const userId = (req.session as any).userId;
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    if (!sub)
      return res.status(404).json({ message: "No active subscription" });

    if (sub.razorpaySubId) {
      try {
        await cancelRazorpaySubscription(sub.razorpaySubId);
      } catch (e) {}
    }

    await db
      .update(subscriptions)
      .set({ status: "cancelled", cancelledAt: new Date(), autoRenew: false })
      .where(eq(subscriptions.id, sub.id));

    res.json({ success: true });
  },

  // ── SuperAdmin: List all registered admin users with org + subscription ──
  async listUsers(req: Request, res: Response) {
    const result = await db
      .select({
        user: { id: users.id, name: users.name, email: users.email, role: users.role, isOnboarded: users.isOnboarded, createdAt: users.createdAt, isActive: users.isActive },
        org: { name: organizations.name, logo: organizations.logo },
        subscription: { status: subscriptions.status, endDate: subscriptions.endDate, billingCycle: subscriptions.billingCycle },
        plan: { name: plans.name },
      })
      .from(users)
      .leftJoin(organizations, eq(organizations.userId, users.id))
      .leftJoin(subscriptions, and(eq(subscriptions.userId, users.id), eq(subscriptions.status, "active")))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.createdAt));
    res.json(result);
  },

  // ── SuperAdmin: List all subscriptions ───────────────────────────────────
  async listAll(req: Request, res: Response) {
    const result = await db
      .select({
        subscription: subscriptions,
        plan: plans,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
        },
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.createdAt));
    res.json(result);
  },

  // ── SuperAdmin: List all payments ─────────────────────────────────────────
  async listPayments(req: Request, res: Response) {
    const result = await db
      .select({
        payment: payments,
        plan: plans,
        user: { id: users.id, name: users.name, email: users.email },
      })
      .from(payments)
      .innerJoin(plans, eq(payments.planId, plans.id))
      .innerJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt));
    res.json(result);
  },

  // ── SuperAdmin: Override subscription ────────────────────────────────────
  async adminOverride(req: Request, res: Response) {
    try {
      const schema = z.object({
        userId: z.coerce.number(),
        planId: z.coerce.number(),
        billingCycle: z
          .enum(["monthly", "yearly", "lifetime"])
          .default("monthly"),
        durationDays: z.coerce.number().default(30),
        status: z.enum(["active", "cancelled", "expired"]).default("active"),
      });
      const input = schema.parse(req.body);

      await db
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(subscriptions.userId, input.userId),
            eq(subscriptions.status, "active"),
          ),
        );

      const startDate = new Date();
      const endDate = addDays(startDate, input.durationDays);

      const [sub] = await db
        .insert(subscriptions)
        .values({
          userId: input.userId,
          planId: input.planId,
          billingCycle: input.billingCycle,
          status: input.status,
          startDate,
          endDate,
          autoRenew: false,
        })
        .returning();

      res.status(201).json(sub);
    } catch (err) {
      if (err instanceof z.ZodError)
        return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },
};
