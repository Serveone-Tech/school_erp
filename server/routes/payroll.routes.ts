import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { db } from "../db";
import { payroll, staffLeave } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

function buildWhere(table: any, adminId: number, branchId?: number) {
  const conds: any[] = [eq(table.adminId, adminId)];
  if (branchId) conds.push(eq(table.branchId, branchId));
  return conds.length === 1 ? conds[0] : and(...conds);
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await db.select().from(payroll).where(buildWhere(payroll, adminId, branchId));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [p] = await db.insert(payroll).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(p);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [p] = await db.update(payroll).set(req.body).where(eq(payroll.id, Number(req.params.id))).returning();
    res.json(p);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Staff Leave
router.get("/leave", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await db.select().from(staffLeave).where(buildWhere(staffLeave, adminId, branchId));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/leave", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [l] = await db.insert(staffLeave).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(l);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/leave/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [l] = await db.update(staffLeave).set(req.body).where(eq(staffLeave.id, Number(req.params.id))).returning();
    res.json(l);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
