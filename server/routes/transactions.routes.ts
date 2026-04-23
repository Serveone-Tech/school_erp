import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }
function toDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

router.get("/", requireAuth, async (req, res) => {
  try { res.json(await storage.getTransactions({ adminId: getAdminId(req), branchId: req.query.branchId ? Number(req.query.branchId) : undefined })); }
  catch (err: any) { res.status(500).json({ message: err.message }); }
});
router.post("/", requireAuth, async (req, res) => {
  try {
    const body = { ...req.body, adminId: getAdminId(req), date: toDate(req.body.date) ?? new Date() };
    res.status(201).json(await storage.createTransaction(body));
  }
  catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
