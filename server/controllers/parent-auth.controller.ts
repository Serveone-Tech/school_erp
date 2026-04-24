import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "../storage";
import { z } from "zod";
import { sendEmail } from "../utils/messaging.service";

// In-memory OTP store for parent forgot-password flow
const parentOtpStore = new Map<string, { otp: string; expiry: Date }>();
const parentResetTokenStore = new Map<string, { email: string; adminId: number; expiry: Date }>();

export function requireParent(req: Request, res: Response, next: NextFunction) {
  if (!req.session.parentId) {
    return res.status(401).json({ message: "Parent authentication required" });
  }
  next();
}

export const ParentAuthController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    // A parent account is scoped to a specific school (adminId). Since the parent
    // doesn't know their adminId, we look up by email across all accounts and
    // find the first active one that matches the password.
    const { db } = await import("../db");
    const { parentPortalUsers } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    const accounts = await db.select().from(parentPortalUsers)
      .where(eq(parentPortalUsers.email, email.toLowerCase()));

    if (!accounts.length) return res.status(401).json({ message: "Invalid credentials" });

    // Try each account (in multi-tenant setups the same email exists only once per adminId)
    let matched = null;
    for (const account of accounts) {
      if (!account.isActive) continue;
      const valid = await bcrypt.compare(password, account.passwordHash);
      if (valid) { matched = account; break; }
    }

    if (!matched) return res.status(401).json({ message: "Invalid credentials" });

    req.session.parentId = matched.id;
    req.session.parentAdminId = matched.adminId;
    req.session.parentStudentIds = matched.studentIds;
    req.session.parentActiveStudentId = matched.studentIds[0] ?? undefined;
    req.session.userRole = "parent";

    // Update last login time (fire and forget)
    storage.updateParentPortalUser(matched.id, { lastLoginAt: new Date() }).catch(() => {});

    const { passwordHash, ...safe } = matched;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "Session error, try again" });
      res.json({ parent: safe });
    });
  },

  async logout(req: Request, res: Response) {
    req.session.destroy(() => {});
    res.json({ message: "Logged out" });
  },

  async me(req: Request, res: Response) {
    const parentId = req.session.parentId;
    if (!parentId) return res.status(401).json({ message: "Not authenticated" });

    const parent = await storage.getParentById(parentId);
    if (!parent) return res.status(401).json({ message: "Parent not found" });

    // Get active student info
    const activeStudentId = req.session.parentActiveStudentId;
    let activeStudent = null;
    if (activeStudentId) {
      activeStudent = await storage.getStudent(activeStudentId);
    }

    const { passwordHash, ...safe } = parent;
    res.json({ parent: safe, activeStudent, activeStudentId });
  },

  async switchChild(req: Request, res: Response) {
    const { studentId } = req.body;
    const allowed = req.session.parentStudentIds ?? [];
    if (!allowed.includes(Number(studentId))) {
      return res.status(403).json({ message: "Not authorized for this student" });
    }
    req.session.parentActiveStudentId = Number(studentId);
    res.json({ activeStudentId: Number(studentId) });
  },

  async changePassword(req: Request, res: Response) {
    const parentId = req.session.parentId!;
    const schema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(6, "Password must be at least 6 characters"),
    });
    try {
      const { currentPassword, newPassword } = schema.parse(req.body);
      const parent = await storage.getParentById(parentId);
      if (!parent) return res.status(404).json({ message: "Account not found" });
      const valid = await bcrypt.compare(currentPassword, parent.passwordHash);
      if (!valid) return res.status(400).json({ message: "Current password is incorrect" });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateParentPortalUser(parentId, { passwordHash });
      res.json({ message: "Password changed successfully." });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  async forgotPassword(req: Request, res: Response) {
    const schema = z.object({ email: z.string().email() });
    try {
      const { email } = schema.parse(req.body);
      const { db } = await import("../db");
      const { parentPortalUsers } = await import("../../shared/schema");
      const { eq } = await import("drizzle-orm");

      const accounts = await db.select().from(parentPortalUsers)
        .where(eq(parentPortalUsers.email, email.toLowerCase()));

      if (accounts.length && accounts[0].isActive) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);
        parentOtpStore.set(email.toLowerCase(), { otp, expiry });

        await sendEmail({
          to: email,
          subject: "Parent Portal — Password Reset OTP",
          text: `Your password reset OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`,
        });

        console.log(`[ParentPortal] OTP for ${email}: ${otp}`);
      }

      res.json({ message: "If this email is registered, an OTP has been sent." });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  async verifyOtp(req: Request, res: Response) {
    const schema = z.object({ email: z.string().email(), otp: z.string().length(6) });
    try {
      const { email, otp } = schema.parse(req.body);
      const record = parentOtpStore.get(email.toLowerCase());
      if (!record || record.otp !== otp || record.expiry < new Date()) {
        return res.status(400).json({ message: "Invalid or expired OTP. Please try again." });
      }
      parentOtpStore.delete(email.toLowerCase());

      const { db } = await import("../db");
      const { parentPortalUsers } = await import("../../shared/schema");
      const { eq } = await import("drizzle-orm");
      const accounts = await db.select().from(parentPortalUsers)
        .where(eq(parentPortalUsers.email, email.toLowerCase()));
      const adminId = accounts[0]?.adminId ?? 0;

      const token = crypto.randomBytes(32).toString("hex");
      parentResetTokenStore.set(token, { email: email.toLowerCase(), adminId, expiry: new Date(Date.now() + 15 * 60 * 1000) });
      res.json({ resetToken: token });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },

  async resetPassword(req: Request, res: Response) {
    const schema = z.object({
      resetToken: z.string(),
      newPassword: z.string().min(6, "Password must be at least 6 characters"),
    });
    try {
      const { resetToken, newPassword } = schema.parse(req.body);
      const record = parentResetTokenStore.get(resetToken);
      if (!record || record.expiry < new Date()) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new OTP." });
      }
      const parent = await storage.getParentByEmail(record.email, record.adminId);
      if (!parent) return res.status(404).json({ message: "Account not found." });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.updateParentPortalUser(parent.id, { passwordHash });
      parentResetTokenStore.delete(resetToken);
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  },
};
