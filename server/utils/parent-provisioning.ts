import crypto from "crypto";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { sendEmailWithAdminConfig } from "./messaging.service";
import type { Student } from "../../shared/schema";

export async function provisionParentAccount(student: Student, adminId: number): Promise<void> {
  try {
    const email = student.fatherEmail?.trim().toLowerCase();
    if (!email) return;

    const existing = await storage.getParentByEmail(email, adminId);

    if (existing) {
      // Already has an account — just link this student if not already linked
      if (!existing.studentIds.includes(student.id)) {
        await storage.addStudentToParent(existing.id, student.id);
      }
      return;
    }

    // Generate a random 8-character password: letters + digits
    const plainPassword = crypto.randomBytes(6).toString("base64url").slice(0, 8);
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await storage.createParentPortalUser({
      email,
      passwordHash,
      fatherName: student.fatherName ?? null,
      studentIds: [student.id],
      adminId,
    });

    const loginUrl = `${process.env.APP_URL || "http://localhost:5000"}/parent/login`;

    await sendEmailWithAdminConfig(adminId, {
      to: email,
      subject: "Parent Portal Access — School ERP",
      text: `Dear ${student.fatherName || "Parent"},

Your child ${student.name} has been enrolled. You can now access the Parent Portal to track attendance, fees, exam results, and more.

Login URL: ${loginUrl}
Email: ${email}
Password: ${plainPassword}

Please change your password after your first login from the portal settings.

If you have any questions, please contact the school administration.`,
    });

    console.log(`[ParentPortal] Account created for ${email} (student: ${student.name})`);
  } catch (err: any) {
    console.error(`[ParentPortal] Provisioning failed for student ${student.id}:`, err.message);
  }
}
