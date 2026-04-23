import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { staffAttendance, staff } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { date, branchId } = req.query as any;
    const conds: any[] = [eq(staffAttendance.adminId, adminId)];
    if (date) conds.push(eq(staffAttendance.date, date));
    if (branchId) conds.push(eq(staffAttendance.branchId, Number(branchId)));
    const data = await db.select().from(staffAttendance).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/bulk", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { records } = req.body;
    const results = [];
    for (const record of records) {
      const [existing] = await db.select().from(staffAttendance)
        .where(and(eq(staffAttendance.staffId, record.staffId), eq(staffAttendance.date, record.date)));
      if (existing) {
        const [u] = await db.update(staffAttendance).set({ ...record, adminId }).where(eq(staffAttendance.id, existing.id)).returning();
        results.push(u);
      } else {
        const [i] = await db.insert(staffAttendance).values({ ...record, adminId }).returning();
        results.push(i);
      }
    }
    res.json({ saved: results.length });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
