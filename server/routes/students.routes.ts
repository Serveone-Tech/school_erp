import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";
import { provisionParentAccount } from "../utils/parent-provisioning";

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
    const item = await storage.createStudent({ ...req.body, adminId });
    provisionParentAccount(item, adminId).catch(() => {});
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id, createdAt, adminId, ...data } = req.body;
    const item = await storage.updateStudent(Number(req.params.id), data);
    const scopedAdminId = getAdminId(req);
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
