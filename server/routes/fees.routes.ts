import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { storage } from "../storage";
import { db } from "../db";
import { feePayments, feeStructure } from "@shared/schema";
import { eq, and, sum } from "drizzle-orm";

const router = Router();
function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

function toDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

// ── Fee Structure ──────────────────────────────────────────────────────────────

router.get("/structure", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getFeeStructures({ adminId, classId: req.query.classId ? Number(req.query.classId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/structure", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const item = await storage.createFeeStructure({ ...req.body, adminId, amount: Number(req.body.amount) });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/structure/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(feeStructure).where(eq(feeStructure.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// ── Remaining fee for a student + structure (+ optional month) ─────────────────
router.get("/remaining", requireAuth, async (req, res) => {
  try {
    const studentId = Number(req.query.studentId);
    const feeStructureId = Number(req.query.feeStructureId);
    const month = req.query.month as string | undefined;

    if (!studentId || !feeStructureId) return res.status(400).json({ message: "studentId and feeStructureId required" });

    // Get the fee structure amount
    const [struct] = await db.select().from(feeStructure).where(eq(feeStructure.id, feeStructureId));
    if (!struct) return res.status(404).json({ message: "Fee structure not found" });

    // Sum all previous payments for this student + structure (+ month if provided)
    const conds: any[] = [
      eq(feePayments.studentId, studentId),
      eq(feePayments.feeStructureId, feeStructureId),
    ];
    if (month) conds.push(eq(feePayments.month, month));

    const rows = await db.select().from(feePayments).where(and(...conds));
    const totalPaid = rows.reduce((s, r) => s + (r.netAmount || 0), 0);
    const remaining = Math.max(0, struct.amount - totalPaid);

    res.json({
      structureAmount: struct.amount,
      totalPaid,
      remaining,
      frequency: struct.frequency,
      payments: rows.length,
    });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Fee Payments ───────────────────────────────────────────────────────────────

router.get("/payments", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const data = await storage.getFeePayments({ adminId, studentId: req.query.studentId ? Number(req.query.studentId) : undefined, branchId: req.query.branchId ? Number(req.query.branchId) : undefined });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/payments", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const receiptNo = `RCP-${Date.now()}`;
    const netAmount = Number(req.body.amount || 0) - Number(req.body.discount || 0) + Number(req.body.fine || 0);
    const paymentDate = toDate(req.body.paymentDate) ?? new Date();
    const dueDate = toDate(req.body.dueDate);

    const item = await storage.createFeePayment({
      ...req.body,
      adminId,
      receiptNo,
      netAmount,
      amount: Number(req.body.amount || 0),
      discount: Number(req.body.discount || 0),
      fine: Number(req.body.fine || 0),
      studentId: Number(req.body.studentId),
      feeStructureId: req.body.feeStructureId ? Number(req.body.feeStructureId) : null,
      paymentDate,
      dueDate,
    });

    // Auto-create transaction entry
    try {
      const structName = req.body.feeStructureName ? ` - ${req.body.feeStructureName}` : "";
      await storage.createTransaction({
        type: "Income",
        category: "Fee Collection",
        amount: netAmount,
        description: `Fee${structName} - Receipt ${receiptNo}${req.body.month ? ` (${req.body.month})` : ""}`,
        date: paymentDate,
        adminId,
        branchId: req.body.branchId ? Number(req.body.branchId) : null,
      });
    } catch { /* don't block fee on transaction failure */ }

    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
