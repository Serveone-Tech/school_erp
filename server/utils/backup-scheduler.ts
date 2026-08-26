import cron from "node-cron";
import { runBackup } from "./backup";
import { db } from "../db";
import { subscriptions, plans, users } from "@shared/schema";
import { eq, and, gt, lte } from "drizzle-orm";
import { differenceInDays } from "date-fns";
import { sendEmail } from "./messaging.service";

export function startBackupScheduler() {
  console.log("[Backup Scheduler] ✅ Started — daily backup at 12:00 AM");

  // Daily at midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("[Backup Scheduler] 🔄 Running scheduled daily backup...");
    try {
      const zipPath = await runBackup();
      console.log(`[Backup Scheduler] ✅ Daily backup saved: ${zipPath}`);
    } catch (err) {
      console.error("[Backup Scheduler] ❌ Scheduled backup failed:", err);
    }
  });

  // Daily at 9 AM — send expiry warning emails for subscriptions expiring within 5 days
  cron.schedule("0 9 * * *", async () => {
    console.log("[Expiry Notifier] 🔄 Checking for expiring subscriptions...");
    try {
      const today = new Date();
      const fiveDaysLater = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000 + 1000);

      const expiringSubs = await db
        .select({ sub: subscriptions, user: users, plan: plans })
        .from(subscriptions)
        .innerJoin(users, eq(subscriptions.userId, users.id))
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            eq(subscriptions.status, "active"),
            gt(subscriptions.endDate, today),
            lte(subscriptions.endDate, fiveDaysLater),
          ),
        );

      for (const { sub, user, plan } of expiringSubs) {
        const daysLeft = differenceInDays(new Date(sub.endDate), today);
        if (daysLeft < 1) continue;

        const expireDateStr = new Date(sub.endDate).toLocaleDateString("en-IN", {
          day: "numeric", month: "long", year: "numeric",
        });

        const result = await sendEmail({
          to: user.email,
          subject: `Action Required: Your ${plan.name} expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
          text: `Dear ${user.name},\n\nThis is a reminder that your ${plan.name} subscription will expire in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}, on ${expireDateStr}.\n\nTo continue using School ERP without any interruption, please renew your plan before it expires.\n\nLog in to your dashboard and go to Subscription Plans to renew.\n\nIf you have any questions, please contact our support team.\n\nThank you,\nSchool ERP Team`,
        });

        if (result.success) {
          console.log(`[Expiry Notifier] ✅ Sent ${daysLeft}-day warning to ${user.email}`);
        } else {
          console.error(`[Expiry Notifier] ❌ Failed to email ${user.email}:`, result.error);
        }
      }

      console.log(`[Expiry Notifier] ✅ Done — checked ${expiringSubs.length} expiring subscription(s)`);
    } catch (err) {
      console.error("[Expiry Notifier] ❌ Failed:", err);
    }
  });
}
