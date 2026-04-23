import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    res.json(await storage.getInventory({ adminId, branchId }));
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    res.status(201).json(await storage.createInventoryItem({ ...req.body, adminId, branchId }));
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    res.json(await storage.updateInventoryItem(Number(req.params.id), req.body));
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
