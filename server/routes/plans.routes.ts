import { Router } from "express";
import {
  PlansController,
  SubscriptionController,
} from "../controllers/plans.controller";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { subscriptionStatusHandler } from "../middleware/subscription.middleware";

const router = Router();

// ── Public: List active plans (pricing page) ──────────────────────────────────
router.get("/", PlansController.list);

// ── Subscription status ───────────────────────────────────────────────────────
router.get("/subscription/status", requireAuth, subscriptionStatusHandler);
router.get("/subscription/mine", requireAuth, SubscriptionController.getMine);

// ── Payment flow ──────────────────────────────────────────────────────────────
router.post(
  "/subscription/order",
  requireAuth,
  SubscriptionController.createOrder,
);
router.post(
  "/subscription/auto",
  requireAuth,
  SubscriptionController.createAutoSubscription,
);
router.post(
  "/subscription/verify",
  requireAuth,
  SubscriptionController.verifyPayment,
);
router.post(
  "/subscription/verify-auto",
  requireAuth,
  SubscriptionController.verifyAutoPayment,
);
router.post("/subscription/cancel", requireAuth, SubscriptionController.cancel);

// ── Razorpay Webhook (public — no auth) ──────────────────────────────────────
router.post("/webhook/razorpay", SubscriptionController.webhook);

// ── SuperAdmin only ───────────────────────────────────────────────────────────
router.post("/", requireAdmin, PlansController.create);
router.put("/:id", requireAdmin, PlansController.update);
router.delete("/:id", requireAdmin, PlansController.remove);
router.get("/admin/users", requireAdmin, SubscriptionController.listUsers);
router.get(
  "/admin/subscriptions",
  requireAdmin,
  SubscriptionController.listAll,
);
router.get(
  "/admin/payments",
  requireAdmin,
  SubscriptionController.listPayments,
);
router.post(
  "/admin/override",
  requireAdmin,
  SubscriptionController.adminOverride,
);

export default router;
