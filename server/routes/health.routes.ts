import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getHealthRecords({ adminId, studentId: req.query.studentId ? Number(req.query.studentId) : undefined, branchId: req.query.branchId ? Number(req.query.branchId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const record = await storage.createHealthRecord({ ...req.body, adminId, branchId });
    res.status(201).json(record);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
