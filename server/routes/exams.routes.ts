import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import { examResults } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getExams({ adminId, classId: req.query.classId ? Number(req.query.classId) : undefined, branchId: req.query.branchId ? Number(req.query.branchId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const item = await storage.createExam({ ...req.body, adminId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const item = await storage.updateExam(Number(req.params.id), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await storage.deleteExam(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Results
router.get("/:id/results", requireAuth, async (req, res) => {
  try {
    const results = await db.select().from(examResults).where(eq(examResults.examId, Number(req.params.id)));
    res.json(results);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/:id/results/bulk", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { results } = req.body;
    const saved = [];
    for (const r of results) {
      const [result] = await db.insert(examResults).values({ ...r, examId: Number(req.params.id), adminId }).returning();
      saved.push(result);
    }
    res.json({ saved: saved.length });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
