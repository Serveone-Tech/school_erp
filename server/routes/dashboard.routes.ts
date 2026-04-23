import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import { students, staff, feePayments, notices, studentAttendance } from "@shared/schema";
import { eq, and, count, desc } from "drizzle-orm";

const router = Router();

function getAdminId(req: any) {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const today = new Date().toISOString().split("T")[0];

    const [studentCount] = await db.select({ count: count() }).from(students).where(and(eq(students.adminId, adminId), eq(students.status, "Active")));
    const [staffCount] = await db.select({ count: count() }).from(staff).where(eq(staff.adminId, adminId));
    const allFees = await db.select().from(feePayments).where(eq(feePayments.adminId, adminId));
    const totalFeeCollected = allFees.reduce((sum, f) => sum + (f.netAmount || 0), 0);
    const recentNotices = await db.select().from(notices).where(eq(notices.adminId, adminId)).orderBy(desc(notices.createdAt)).limit(5);

    res.json({
      stats: {
        totalStudents: studentCount?.count || 0,
        totalStaff: staffCount?.count || 0,
        totalFeeCollected,
        todayDate: today,
      },
      recentNotices,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
