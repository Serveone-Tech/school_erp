import nodemailer from "nodemailer";
import axios from "axios";
import { db } from "../db";
import { emailConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "./crypto";


// ── Email via Gmail SMTP (.env credentials) ───────────────────────────────────
export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM || `School ERP <${emailUser}>`;

    if (!emailUser || !emailPass) {
      console.warn("[Email] EMAIL_USER or EMAIL_PASS not set in .env");
      return { success: false, error: "Email not configured" };
    }

    // Fresh transporter on each call so env var changes take effect without restart
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      text,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <p style="font-size:15px;color:#1e293b;line-height:1.6">${text.replace(/\n/g, "<br>")}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#94a3b8;font-size:12px">This is an automated message. Please do not reply.</p>
      </div>`,
    });

    console.log(`[Email] ✅ Sent to ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] ❌ Failed:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── Per-admin email (fetches encrypted credentials from DB) ──────────────────
export async function sendEmailWithAdminConfig(
  adminId: number,
  { to, subject, text }: { to: string; subject: string; text: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const [cfg] = await db.select().from(emailConfigs).where(eq(emailConfigs.adminId, adminId));
    if (!cfg) {
      console.warn(`[Email] No email config for adminId=${adminId}, falling back to global config`);
      return sendEmail({ to, subject, text });
    }

    const emailUser = decrypt(cfg.emailUser);
    const emailPass = decrypt(cfg.emailPass);
    const fromName  = cfg.emailFromName || "School ERP";

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailUser, pass: emailPass },
    });

    await transporter.sendMail({
      from: `${fromName} <${emailUser}>`,
      to,
      subject,
      text,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
        <h2 style="color:#1d4ed8">${fromName}</h2>
        <p>${text.replace(/\n/g, "<br>")}</p>
        <hr><p style="color:#888;font-size:12px">This is an automated message. Please do not reply.</p>
      </div>`,
    });

    console.log(`[Email] ✅ (admin ${adminId}) Sent to ${to}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email] ❌ (admin ${adminId}) Failed:`, err.message);
    return { success: false, error: err.message };
  }
}

// ── WhatsApp via Meta Business API ───────────────────────────────────────────
export async function sendWhatsApp({
  to,
  message,
}: {
  to: string;   // format: 919876543210 (country code without +)
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
      console.warn("[WhatsApp] WHATSAPP_TOKEN or WHATSAPP_PHONE_ID not set in .env");
      return { success: false, error: "WhatsApp not configured" };
    }

    // Phone number clean karo — sirf digits rakho, country code add karo
    const cleanPhone = to.replace(/\D/g, "");
    const phoneWithCC = cleanPhone.startsWith("91")
      ? cleanPhone
      : `91${cleanPhone}`;

    const url = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to: phoneWithCC,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`[WhatsApp] ✅ Sent to ${phoneWithCC}`);
    return { success: true };
  } catch (err: any) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`[WhatsApp] ❌ Failed:`, msg);
    return { success: false, error: msg };
  }
}

// ── SMS via Fast2SMS (India) ──────────────────────────────────────────────────
// Free signup: https://www.fast2sms.com
// Free credits milte hain signup par
export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.FAST2SMS_KEY) {
      console.warn("[SMS] FAST2SMS_KEY not set in .env");
      return { success: false, error: "SMS not configured" };
    }

    // Phone number clean karo
    const cleanPhone = to.replace(/\D/g, "").replace(/^91/, ""); // 10 digit chahiye

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",           // Quick Transactional route
        message,
        language: "english",
        flash: 0,
        numbers: cleanPhone,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_KEY,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data?.return === true) {
      console.log(`[SMS] ✅ Sent to ${cleanPhone}`);
      return { success: true };
    } else {
      const errMsg = response.data?.message?.[0] || "Unknown error";
      console.error(`[SMS] ❌ Failed:`, errMsg);
      return { success: false, error: errMsg };
    }
  } catch (err: any) {
    const msg = err.response?.data?.message?.[0] || err.message;
    console.error(`[SMS] ❌ Failed:`, msg);
    return { success: false, error: msg };
  }
}

// ── Unified send function ─────────────────────────────────────────────────────
export async function sendMessage({
  type,
  to,
  subject,
  content,
}: {
  type: "Email" | "SMS" | "WhatsApp";
  to: string;       // phone number ya email
  subject?: string; // only for Email
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  switch (type) {
    case "Email":
      return sendEmail({
        to,
        subject: subject || "Message from ZALGO INFOTECH",
        text: content,
      });
    case "WhatsApp":
      return sendWhatsApp({ to, message: content });
    case "SMS":
      return sendSMS({ to, message: content });
    default:
      return { success: false, error: "Unknown message type" };
  }
}