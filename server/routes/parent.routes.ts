import { Router } from "express";
import { ParentAuthController, requireParent } from "../controllers/parent-auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import {
  studentAttendance, feePayments, feeStructure, exams, examResults,
  notices, homework, studentRemarks, communications, classes, sections, subjects
} from "@shared/schema";
import { eq, and, like, desc, asc } from "drizzle-orm";

const router = Router();

function getParentCtx(req: any) {
  return {
    parentId: req.session.parentId as number,
    adminId: req.session.parentAdminId as number,
    activeStudentId: req.session.parentActiveStudentId as number,
    studentIds: (req.session.parentStudentIds ?? []) as number[],
  };
}

function assertStudentAccess(ctx: ReturnType<typeof getParentCtx>, res: any): boolean {
  if (!ctx.activeStudentId || !ctx.studentIds.includes(ctx.activeStudentId)) {
    res.status(403).json({ message: "No student access" });
    return false;
  }
  return true;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
router.post("/login", ParentAuthController.login);
router.post("/logout", requireParent, ParentAuthController.logout);
router.get("/me", requireParent, ParentAuthController.me);
router.post("/switch-child", requireParent, ParentAuthController.switchChild);
router.post("/change-password", requireParent, ParentAuthController.changePassword);
router.post("/forgot-password", ParentAuthController.forgotPassword);
router.post("/verify-otp", ParentAuthController.verifyOtp);
router.post("/reset-password", ParentAuthController.resetPassword);

// ── Student Profile ───────────────────────────────────────────────────────────
router.get("/profile", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const student = await storage.getStudent(ctx.activeStudentId);
    if (!student || student.adminId !== ctx.adminId) return res.status(404).json({ message: "Student not found" });

    // Fetch class and section names
    const [cls] = student.classId
      ? await db.select({ name: classes.name }).from(classes).where(eq(classes.id, student.classId))
      : [null];
    const [sec] = student.sectionId
      ? await db.select({ name: sections.name }).from(sections).where(eq(sections.id, student.sectionId))
      : [null];

    res.json({ ...student, className: cls?.name ?? null, sectionName: sec?.name ?? null });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Attendance ────────────────────────────────────────────────────────────────
router.get("/attendance", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const month = req.query.month as string | undefined; // YYYY-MM

    const conds: any[] = [
      eq(studentAttendance.studentId, ctx.activeStudentId),
      eq(studentAttendance.adminId, ctx.adminId),
    ];
    if (month) conds.push(like(studentAttendance.date, `${month}%`));

    const records = await db.select().from(studentAttendance)
      .where(and(...conds))
      .orderBy(desc(studentAttendance.date));

    const summary = {
      total: records.length,
      present: records.filter(r => r.status === "Present").length,
      absent: records.filter(r => r.status === "Absent").length,
      late: records.filter(r => r.status === "Late").length,
      halfDay: records.filter(r => r.status === "Half Day").length,
    };

    res.json({ records, summary });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Fees ──────────────────────────────────────────────────────────────────────
router.get("/fees", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const student = await storage.getStudent(ctx.activeStudentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const payments = await db.select().from(feePayments)
      .where(and(eq(feePayments.studentId, ctx.activeStudentId), eq(feePayments.adminId, ctx.adminId)))
      .orderBy(desc(feePayments.paymentDate));

    const structures = student.classId
      ? await db.select().from(feeStructure)
          .where(and(eq(feeStructure.adminId, ctx.adminId), eq(feeStructure.classId, student.classId)))
      : [];

    const totalPaid = payments.reduce((s, p) => s + (p.netAmount ?? 0), 0);

    res.json({ payments, structures, summary: { totalPaid } });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Exams & Results ───────────────────────────────────────────────────────────
router.get("/exams", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const student = await storage.getStudent(ctx.activeStudentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!student.classId) return res.json([]);

    const examList = await db.select().from(exams)
      .where(and(eq(exams.adminId, ctx.adminId), eq(exams.classId, student.classId)))
      .orderBy(desc(exams.date));

    if (!examList.length) return res.json([]);

    // Fetch results for this student
    const resultRows = await db.select().from(examResults)
      .where(and(
        eq(examResults.studentId, ctx.activeStudentId),
        eq(examResults.adminId, ctx.adminId),
      ));

    const resultsMap = new Map(resultRows.map(r => [r.examId, r]));

    // Fetch subject names
    const subjectIds = Array.from(new Set(examList.map(e => e.subjectId).filter(Boolean))) as number[];
    const subjectRows = subjectIds.length
      ? await db.select({ id: subjects.id, name: subjects.name }).from(subjects)
          .where(eq(subjects.adminId, ctx.adminId))
      : [];
    const subjectMap = new Map(subjectRows.map(s => [s.id, s.name]));

    const combined = examList.map(exam => ({
      ...exam,
      subjectName: exam.subjectId ? (subjectMap.get(exam.subjectId) ?? null) : null,
      result: resultsMap.get(exam.id) ?? null,
    }));

    res.json(combined);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Notices ───────────────────────────────────────────────────────────────────
router.get("/notices", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const student = await storage.getStudent(ctx.activeStudentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const allNotices = await storage.getNotices({ adminId: ctx.adminId });
    // Show notices targeted to All or Parents, for all classes or student's class
    const filtered = allNotices.filter(n => {
      const audience = n.targetAudience ?? "All";
      if (!["All", "Parents", "Students"].includes(audience)) return false;
      if (n.classId && n.classId !== student.classId) return false;
      return true;
    });

    res.json(filtered);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Homework ──────────────────────────────────────────────────────────────────
router.get("/homework", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const student = await storage.getStudent(ctx.activeStudentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    const data = await storage.getHomework({
      adminId: ctx.adminId,
      classId: student.classId ?? undefined,
    });

    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Remarks ───────────────────────────────────────────────────────────────────
router.get("/remarks", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const records = await db.select().from(studentRemarks)
      .where(and(
        eq(studentRemarks.studentId, ctx.activeStudentId),
        eq(studentRemarks.adminId, ctx.adminId),
      ))
      .orderBy(desc(studentRemarks.date))
      .limit(50);

    res.json(records);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Messages (Parent-Teacher Communication) ───────────────────────────────────
router.get("/messages", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const records = await db.select().from(communications)
      .where(and(
        eq(communications.studentId, ctx.activeStudentId),
        eq(communications.adminId, ctx.adminId),
      ))
      .orderBy(asc(communications.sentAt));

    res.json(records);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/messages", requireParent, async (req, res) => {
  try {
    const ctx = getParentCtx(req);
    if (!assertStudentAccess(ctx, res)) return;

    const { message, subject } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });

    const [record] = await db.insert(communications).values({
      studentId: ctx.activeStudentId,
      type: "Message",
      subject: subject ?? null,
      message: message.trim(),
      direction: "Incoming",
      adminId: ctx.adminId,
    }).returning();

    res.status(201).json(record);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
