import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { admissions, students, classes } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import { provisionParentAccount } from "../utils/parent-provisioning";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

function toDate(val: any): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { branchId, status } = req.query as any;
    const conds: any[] = [eq(admissions.adminId, adminId)];
    if (branchId) conds.push(eq(admissions.branchId, Number(branchId)));
    if (status) conds.push(eq(admissions.status, status));
    const data = await db.select().from(admissions).where(and(...conds)).orderBy(admissions.createdAt);
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const { id: _id, createdAt: _c, studentId: _s, ...fields } = req.body;
    const [item] = await db.insert(admissions).values({
      ...fields,
      adminId,
      branchId,
      admissionDate: toDate(req.body.admissionDate) ?? new Date(),
    }).returning();
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id: _id, createdAt: _c, adminId: _a, ...fields } = req.body;
    const [item] = await db.update(admissions).set(fields).where(eq(admissions.id, Number(req.params.id))).returning();
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Convert approved admission → create student record
router.post("/:id/admit", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const admission = await db.select().from(admissions).where(eq(admissions.id, Number(req.params.id))).then(r => r[0]);
    if (!admission) return res.status(404).json({ message: "Admission not found" });
    if (admission.studentId) return res.status(400).json({ message: "Already admitted", studentId: admission.studentId });

    // Auto-generate admission number
    const existing = await db.select().from(students).where(eq(students.adminId, adminId));
    const admissionNo = `ADM-${String(existing.length + 1).padStart(4, "0")}`;

    // Try to match classApplied text to a real class for auto roll-no generation
    let matchedClassId: number | null = null;
    let rollNo: string | undefined = undefined;
    if (admission.classApplied) {
      const [matchedClass] = await db.select().from(classes)
        .where(and(eq(classes.adminId, adminId), ilike(classes.name, admission.classApplied)));
      if (matchedClass) {
        matchedClassId = matchedClass.id;
        const classStudents = await db.select({ rollNo: students.rollNo }).from(students)
          .where(and(eq(students.adminId, adminId), eq(students.classId, matchedClassId)));
        const nums = classStudents
          .map(s => s.rollNo)
          .filter(r => r && /^\d+$/.test(String(r)))
          .map(Number);
        rollNo = String(nums.length > 0 ? Math.max(...nums) + 1 : 1);
      }
    }

    const [student] = await db.insert(students).values({
      admissionNo,
      name: admission.applicantName,
      gender: admission.gender ?? undefined,
      dob: admission.dob ?? undefined,
      phone: admission.phone ?? undefined,
      email: admission.email ?? undefined,
      address: admission.address ?? undefined,
      fatherName: admission.fatherName ?? undefined,
      motherName: admission.motherName ?? undefined,
      fatherPhone: admission.fatherPhone ?? undefined,
      fatherEmail: (admission as any).fatherEmail ?? undefined,
      classId: matchedClassId,
      rollNo,
      admissionDate: admission.admissionDate ? admission.admissionDate.toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      adminId,
      branchId: admission.branchId ?? undefined,
      status: "Active",
    }).returning();

    await db.update(admissions).set({ studentId: student.id, status: "Approved" }).where(eq(admissions.id, admission.id));

    // Fire parent portal provisioning — sends email with credentials if fatherEmail is set
    provisionParentAccount(student, adminId).catch(e => console.error("[ParentPortal]", e.message));

    res.json({ student, message: "Student admitted successfully" });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(admissions).where(eq(admissions.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
