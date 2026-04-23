import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import { studentAttendance, students } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { classId, sectionId, date, studentId, branchId } = req.query as any;
    const data = await storage.getAttendance({
      adminId,
      classId: classId ? Number(classId) : undefined,
      sectionId: sectionId ? Number(sectionId) : undefined,
      date, studentId: studentId ? Number(studentId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
    });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/bulk", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { records } = req.body; // [{ studentId, date, status, classId, sectionId }]
    const results = [];
    for (const record of records) {
      const r = await storage.upsertAttendance({ ...record, adminId });
      results.push(r);
    }
    res.json({ saved: results.length });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const [a] = await db.update(studentAttendance).set(req.body).where(eq(studentAttendance.id, Number(req.params.id))).returning();
    res.json(a);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Monthly report: per-student attendance summary for a class/month
router.get("/report", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { classId, sectionId, month, year } = req.query as any;
    const m = Number(month) || (new Date().getMonth() + 1);
    const y = Number(year) || new Date().getFullYear();
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const studentList = await storage.getStudents({
      adminId,
      classId: classId ? Number(classId) : undefined,
      sectionId: sectionId ? Number(sectionId) : undefined,
    });
    if (!studentList.length) return res.json([]);

    const conds: any[] = [eq(studentAttendance.adminId, adminId), gte(studentAttendance.date, startDate), lte(studentAttendance.date, endDate)];
    if (classId) conds.push(eq(studentAttendance.classId, Number(classId)));
    if (sectionId) conds.push(eq(studentAttendance.sectionId, Number(sectionId)));
    const records = await db.select().from(studentAttendance).where(and(...conds));

    const report = studentList.map((s: any) => {
      const sr = records.filter((r: any) => r.studentId === s.id);
      const counts: Record<string, number> = { Present: 0, Absent: 0, Late: 0, "Half Day": 0, Holiday: 0 };
      sr.forEach((r: any) => { if (counts[r.status] !== undefined) counts[r.status]++; });
      return { studentId: s.id, name: s.name, rollNo: s.rollNo, ...counts, totalDays: sr.length, records: sr.sort((a: any, b: any) => a.date.localeCompare(b.date)) };
    });
    res.json(report);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

export default router;
