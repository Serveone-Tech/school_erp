import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { studentRemarks } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { studentId, branchId, date } = req.query as any;
    const conds: any[] = [eq(studentRemarks.adminId, adminId)];
    if (studentId) conds.push(eq(studentRemarks.studentId, Number(studentId)));
    if (branchId) conds.push(eq(studentRemarks.branchId, Number(branchId)));
    if (date) conds.push(eq(studentRemarks.date, date));
    const data = await db.select().from(studentRemarks).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [item] = await db.insert(studentRemarks).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(studentRemarks).where(eq(studentRemarks.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
