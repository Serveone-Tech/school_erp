import type { Request, Response } from "express";
import { storage } from "../storage";
import { db } from "../db";
import {
  notifications,
  feePayments,
  students,
} from "@shared/schema";
import { eq, and, lte } from "drizzle-orm";

// ── Smart notification refresh ────────────────────────────────────────────────
// 1. Paid installments ki notifications delete karo
// 2. Genuinely overdue (pending + past due date) ke liye nayi notifications banao
export async function refreshOverdueNotifications(): Promise<void> {
  try {
    // Step 1: Saari existing fee-overdue notifications delete karo
    await db
      .delete(notifications)
      .where(eq(notifications.relatedType, "installment"));

    // Step 2: Genuinely overdue installments fetch karo
    // (status = pending AND dueDate < today)
    const now = new Date();
    const overdueInstallments = await db
      .select({
        inst: feePayments,
        student: students,
      })
      .from(feePayments)
      .innerJoin(students, eq(feePayments.studentId, students.id))
      .where(
        and(
          eq(feePayments.status, "Pending"),
          lte(feePayments.dueDate, now),
        ),
      );

    // Step 3: Har overdue payment ke liye notification banao
    for (const { inst, student } of overdueInstallments) {
      const pending = inst.netAmount;
      if (pending <= 0) continue;

      await storage.createNotification({
        title: "Fee Payment Overdue",
        message: `Receipt #${inst.receiptNo} for ${student.name} is overdue — ₹${pending.toLocaleString("en-IN")} is pending`,
        type: "warning",
        relatedId: inst.id,
        relatedType: "installment",
        adminId: student.adminId,
      });
    }

    console.log(
      `[Notifications] Refreshed — ${overdueInstallments.length} overdue installments found`,
    );
  } catch (err) {
    console.error("[Notifications] Refresh failed:", err);
  }
}

function getAdminId(req: Request): number {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

export const NotificationsController = {
  async list(req: Request, res: Response) {
    const adminId = getAdminId(req);
    const notifs = await storage.getNotifications(adminId);
    res.json(notifs);
  },

  async markRead(req: Request, res: Response) {
    await storage.markNotificationRead(Number(req.params.id));
    res.json({ success: true });
  },

  async markAllRead(req: Request, res: Response) {
    const adminId = getAdminId(req);
    await storage.markAllNotificationsRead(adminId);
    res.json({ success: true });
  },

  // ── DELETE single notification ─────────────────────────────────────────────
  async deleteOne(req: Request, res: Response) {
    await db
      .delete(notifications)
      .where(eq(notifications.id, Number(req.params.id)));
    res.status(204).send();
  },

  // ── DELETE all read notifications ──────────────────────────────────────────
  async clearRead(req: Request, res: Response) {
    const adminId = getAdminId(req);
    await db.delete(notifications).where(
      and(eq(notifications.isRead, true), eq(notifications.adminId, adminId))
    );
    res.json({ success: true });
  },

  // ── Manual refresh trigger (admin) ─────────────────────────────────────────
  async refresh(req: Request, res: Response) {
    const adminId = getAdminId(req);
    await refreshOverdueNotifications();
    const notifs = await storage.getNotifications(adminId);
    res.json({ success: true, count: notifs.length });
  },
};
