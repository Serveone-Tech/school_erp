import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { communications } from "@shared/schema";
import { eq, and, asc } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { studentId, staffId, branchId } = req.query as any;
    const conds: any[] = [eq(communications.adminId, adminId)];
    if (studentId) conds.push(eq(communications.studentId, Number(studentId)));
    if (staffId) conds.push(eq(communications.staffId, Number(staffId)));
    if (branchId) conds.push(eq(communications.branchId, Number(branchId)));
    const data = await db.select().from(communications).where(and(...conds)).orderBy(asc(communications.sentAt));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [item] = await db.insert(communications).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(communications).where(eq(communications.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
