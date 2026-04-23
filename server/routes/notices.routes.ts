import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }
function toDate(val: any): Date | undefined { if (!val) return undefined; const d = new Date(val); return isNaN(d.getTime()) ? undefined : d; }

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await storage.getNotices({ adminId, branchId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const all = await storage.getNotices({ adminId });
    const data = all.find((n: any) => n.id === Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const item = await storage.createNotice({ ...req.body, adminId, branchId, publishDate: toDate(req.body.publishDate), expiryDate: toDate(req.body.expiryDate) });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const item = await storage.updateNotice(Number(req.params.id), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteNotice(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
