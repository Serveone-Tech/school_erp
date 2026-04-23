import cron from "node-cron";
import { runBackup } from "./backup";

// ── Daily backup at 12:00 AM (midnight) ──────────────────────────────────────
// Cron format: second minute hour day month weekday
// "0 0 * * *" = every day at 00:00

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

  // ── Startup backup — server start par ek baar turant backup lo ────────────
  // (optional: comment out karo agar nahi chahiye)
  setTimeout(async () => {
    console.log("[Backup Scheduler] 🔄 Running startup backup...");
    try {
      await runBackup();
    } catch (err) {
      console.error("[Backup Scheduler] ❌ Startup backup failed:", err);
    }
  }, 5000); // server fully start hone ka wait
}
