import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

// Classes
router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await storage.getClasses({ adminId, branchId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const item = await storage.createClass({ ...req.body, adminId, branchId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const item = await storage.updateClass(Number(req.params.id), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteClass(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// All sections for admin (for bulk loading counts and expand-row data)
router.get("/all-sections", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getSections({ adminId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// Sections per class
router.get("/:id/sections", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getSections({ classId: Number(req.params.id), adminId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/:id/sections", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const item = await storage.createSection({ ...req.body, classId: Number(req.params.id), adminId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/sections/:sectionId", requireAuth, requireAdmin, async (req, res) => {
  try {
    const item = await storage.updateSection(Number(req.params.sectionId), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/sections/:sectionId", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteSection(Number(req.params.sectionId));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Subjects
router.get("/subjects/all", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getSubjects({ adminId, classId: req.query.classId ? Number(req.query.classId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/subjects", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const item = await storage.createSubject({ ...req.body, adminId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// Academic Years
router.get("/academic-years", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getAcademicYears(adminId);
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/academic-years", requireAuth, requireAdmin, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { startDate, endDate, ...rest } = req.body;
    const item = await storage.createAcademicYear({ ...rest, adminId, startDate: new Date(startDate), endDate: new Date(endDate) });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
