import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

function getAdminId(req: any) {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const [org] = await db
      .select({ currency: organizations.currency })
      .from(organizations)
      .where(eq(organizations.userId, adminId));
    res.json({ currency: org?.currency || "USD" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { currency } = req.body;
    if (!currency) return res.status(400).json({ message: "currency required" });
    await db
      .update(organizations)
      .set({ currency })
      .where(eq(organizations.userId, adminId));
    res.json({ currency });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/exchange-rate", async (req, res) => {
  const { from = "INR", to = "USD" } = req.query as any;
  if (from === to) return res.json({ rate: 1 });
  try {
    const response = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
    const data = await response.json();
    const rate = data.rates?.[to] ?? 1;
    res.json({ rate });
  } catch {
    res.json({ rate: 1 });
  }
});

export default router;
