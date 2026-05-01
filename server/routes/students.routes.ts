import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";
import { provisionParentAccount } from "../utils/parent-provisioning";
import { getPlanLimits } from "../middleware/subscription.middleware";
import { db } from "../db";
import { students, sections } from "@shared/schema";
import { eq, and, count } from "drizzle-orm";

const router = Router();

function getAdminId(req: any) {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { classId, sectionId, branchId } = req.query as any;
    const data = await storage.getStudents({ adminId, classId: classId ? Number(classId) : undefined, sectionId: sectionId ? Number(sectionId) : undefined, branchId: branchId ? Number(branchId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const data = await storage.getStudent(Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);

    // ── Plan: max students check ──────────────────────────────────────────────
    const plan = await getPlanLimits(adminId);
    if (plan && plan.maxStudents > 0) {
      const [{ total }] = await db.select({ total: count() }).from(students).where(eq(students.adminId, adminId));
      if (total >= plan.maxStudents) {
        return res.status(402).json({ message: `Student limit reached (${plan.maxStudents}). Please upgrade your plan.` });
      }
    }

    // ── Section: seat capacity check ─────────────────────────────────────────
    if (req.body.sectionId) {
      const sectionId = Number(req.body.sectionId);
      const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
      if (section?.capacity && section.capacity > 0) {
        const [{ seated }] = await db.select({ seated: count() }).from(students)
          .where(and(eq(students.adminId, adminId), eq(students.sectionId, sectionId)));
        if (seated >= section.capacity) {
          return res.status(409).json({ message: `Section is full. Seat capacity (${section.capacity}) has been reached.` });
        }
      }
    }

    const item = await storage.createStudent({ ...req.body, adminId });
    provisionParentAccount(item, adminId).catch(() => {});
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id, createdAt, adminId, ...data } = req.body;
    const scopedAdminId = getAdminId(req);

    // ── Section: seat capacity check on section change ────────────────────────
    if (data.sectionId) {
      const sectionId = Number(data.sectionId);
      const existing = await storage.getStudent(Number(req.params.id));
      if (existing?.sectionId !== sectionId) {
        const [section] = await db.select().from(sections).where(eq(sections.id, sectionId));
        if (section?.capacity && section.capacity > 0) {
          const [{ seated }] = await db.select({ seated: count() }).from(students)
            .where(and(eq(students.adminId, scopedAdminId), eq(students.sectionId, sectionId)));
          if (seated >= section.capacity) {
            return res.status(409).json({ message: `Section is full. Seat capacity (${section.capacity}) has been reached.` });
          }
        }
      }
    }

    const item = await storage.updateStudent(Number(req.params.id), data);
    provisionParentAccount(item, scopedAdminId).catch(() => {});
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteStudent(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
