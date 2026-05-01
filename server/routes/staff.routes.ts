import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";
import { getPlanLimits } from "../middleware/subscription.middleware";
import { db } from "../db";
import { staff } from "@shared/schema";
import { eq, count } from "drizzle-orm";

const router = Router();

function getAdminId(req: any) {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await storage.getStaff({ adminId, branchId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const data = await storage.getStaffMember(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);

    // Plan: max staff check
    const plan = await getPlanLimits(adminId);
    if (plan && plan.maxStaff > 0) {
      const [{ total }] = await db.select({ total: count() }).from(staff).where(eq(staff.adminId, adminId));
      if (total >= plan.maxStaff) {
        return res.status(402).json({ message: `Staff limit reached (${plan.maxStaff}). Please upgrade your plan.` });
      }
    }

    const item = await storage.createStaff({ ...req.body, adminId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id, createdAt, adminId, ...data } = req.body;
    const item = await storage.updateStaff(Number(req.params.id), data);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteStaff(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
