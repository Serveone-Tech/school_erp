import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { admissions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

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
    const data = await db.select().from(admissions).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [item] = await db.insert(admissions).values({ ...req.body, adminId, branchId, admissionDate: toDate(req.body.admissionDate) ?? new Date() }).returning();
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const [item] = await db.update(admissions).set(req.body).where(eq(admissions.id, Number(req.params.id))).returning();
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(admissions).where(eq(admissions.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
