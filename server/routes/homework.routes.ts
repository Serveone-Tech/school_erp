import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { classId, sectionId, branchId } = req.query as any;
    const data = await storage.getHomework({ adminId, classId: classId ? Number(classId) : undefined, sectionId: sectionId ? Number(sectionId) : undefined, branchId: branchId ? Number(branchId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const item = await storage.createHomework({ ...req.body, adminId, branchId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const item = await storage.updateHomework(Number(req.params.id), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await storage.deleteHomework(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
