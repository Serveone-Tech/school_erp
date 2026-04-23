import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { periods } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { classId, sectionId, branchId } = req.query as any;
    const conds: any[] = [eq(periods.adminId, adminId)];
    if (classId) conds.push(eq(periods.classId, Number(classId)));
    if (sectionId) conds.push(eq(periods.sectionId, Number(sectionId)));
    if (branchId) conds.push(eq(periods.branchId, Number(branchId)));
    const data = await db.select().from(periods).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [p] = await db.insert(periods).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(p);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(periods).where(eq(periods.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
