// server/routes.ts
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import authRouter from "./routes/auth.routes";
import branchesRouter from "./routes/branches.routes";
import studentsRouter from "./routes/students.routes";
import staffRouter from "./routes/staff.routes";
import classesRouter from "./routes/classes.routes";
import attendanceRouter from "./routes/attendance.routes";
import homeworkRouter from "./routes/homework.routes";
import examsRouter from "./routes/exams.routes";
import feesRouter from "./routes/fees.routes";
import noticesRouter from "./routes/notices.routes";
import transportRouter from "./routes/transport.routes";
import libraryRouter from "./routes/library.routes";
import inventoryRouter from "./routes/inventory.routes";
import visitorsRouter from "./routes/visitors.routes";
import payrollRouter from "./routes/payroll.routes";
import notificationsRouter from "./routes/notifications.routes";
import plansRouter from "./routes/plans.routes";
import { backupRouter } from "./routes/backup.routes";
import automationRouter from "./routes/automation.routes";
import dashboardRouter from "./routes/dashboard.routes";
import timetableRouter from "./routes/timetable.routes";
import healthRouter from "./routes/health.routes";
import transactionsRouter from "./routes/transactions.routes";
import staffAttendanceRouter from "./routes/staff-attendance.routes";
import remarksRouter from "./routes/remarks.routes";
import galleryRouter from "./routes/gallery.routes";
import communicationsRouter from "./routes/communications.routes";
import admissionsRouter from "./routes/admissions.routes";
import parentRouter from "./routes/parent.routes";
import settingsRouter from "./routes/settings.routes";
import { Router } from "express";
import { requireAuth, requireAdmin } from "./controllers/auth.controller";
import bcrypt from "bcrypt";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use("/api/auth", authRouter);
  app.use("/api/branches", branchesRouter);
  app.use("/api/students", studentsRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/classes", classesRouter);
  app.use("/api/attendance", attendanceRouter);
  app.use("/api/homework", homeworkRouter);
  app.use("/api/exams", examsRouter);
  app.use("/api/fees", feesRouter);
  app.use("/api/notices", noticesRouter);
  app.use("/api/transport", transportRouter);
  app.use("/api/library", libraryRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/visitors", visitorsRouter);
  app.use("/api/payroll", payrollRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/plans", plansRouter);
  app.use("/api/automation", automationRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/timetable", timetableRouter);
  app.use("/api/health", healthRouter);
  app.use("/api/backup", backupRouter);
  app.use("/api/staff-attendance", staffAttendanceRouter);
  app.use("/api/remarks", remarksRouter);
  app.use("/api/gallery", galleryRouter);
  app.use("/api/communications", communicationsRouter);
  app.use("/api/admissions", admissionsRouter);
  app.use("/api/parent", parentRouter);
  app.use("/api/settings", settingsRouter);

  await seedDatabase().catch(console.error);
  return httpServer;
}

async function seedDatabase() {
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await storage.createUser({
      name: "Admin",
      email: "admin@school.com",
      passwordHash,
      role: "admin",
      permissions: ["students", "staff", "classes", "attendance", "homework", "exams", "fees", "notices", "transport", "library", "inventory", "visitors", "payroll", "reports"],
      branchId: null,
      isActive: true,
      adminId: null,
      isOnboarded: false,
      organizationId: null,
    } as any);
    console.log("[seed] Admin user created: admin@school.com / admin123");
  }

  // Seed superadmin if not exists
  const superadmin = await storage.getUserByEmail("superadmin@zalgo.com");
  if (!superadmin) {
    const passwordHash = await bcrypt.hash("superadmin123", 10);
    await storage.createUser({
      name: "Super Admin",
      email: "superadmin@zalgo.com",
      passwordHash,
      role: "superadmin",
      permissions: [],
      branchId: null,
      isActive: true,
      adminId: null,
      isOnboarded: true,
      organizationId: null,
    } as any);
    console.log("[seed] SuperAdmin created: superadmin@zalgo.com / superadmin123");
  }
}
