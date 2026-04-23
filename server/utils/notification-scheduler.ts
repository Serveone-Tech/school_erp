import cron from "node-cron";
import { refreshOverdueNotifications } from "../controllers/notifications.controller";

// ── Daily notification refresh at 8:00 AM ────────────────────────────────────
export function startNotificationScheduler() {
  console.log(
    "[Notification Scheduler] ✅ Started — daily refresh at 8:00 AM",
  );

  // Har roz subah 8 baje overdue check karo
  cron.schedule("0 8 * * *", async () => {
    console.log("[Notification Scheduler] 🔔 Refreshing overdue notifications...");
    await refreshOverdueNotifications();
  });

  // Server start hone ke 3 sec baad ek baar refresh karo
  setTimeout(async () => {
    console.log("[Notification Scheduler] 🔔 Startup notification refresh...");
    await refreshOverdueNotifications();
  }, 3000);
}