// server/utils/automation-trigger.ts — NEW FILE
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { automationCredentials, automationTriggers } from "@shared/schema";

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
  }
  return result;
}

async function getCredentials(adminId: number, channel: string): Promise<any | null> {
  try {
    const [row] = await db.select().from(automationCredentials)
      .where(and(
        eq(automationCredentials.adminId, adminId),
        eq(automationCredentials.channel, channel)
      ));
    if (!row || !row.enabled) return null;
    return JSON.parse(row.config);
  } catch (e: any) {
    console.error("[Automation] getCredentials error:", e.message);
    return null;
  }
}

async function getTriggerConfig(adminId: number, triggerId: string): Promise<{
  enabled: boolean; channels: string[]; template: string;
} | null> {
  try {
    const [row] = await db.select().from(automationTriggers)
      .where(and(
        eq(automationTriggers.adminId, adminId),
        eq(automationTriggers.triggerId, triggerId)
      ));
    if (!row || !row.enabled) return null;
    return {
      enabled: row.enabled,
      channels: row.channels || [],
      template: row.template || "",
    };
  } catch (e: any) {
    console.error("[Automation] getTriggerConfig error:", e.message);
    return null;
  }
}

async function sendEmail(creds: any, to: string, message: string, subject?: string): Promise<void> {
  if (!creds?.sendgridApiKey || !creds?.fromEmail || !to) {
    console.warn("[Automation] Email: missing credentials or recipient");
    return;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: { user: "apikey", pass: creds.sendgridApiKey },
    });
    await transporter.sendMail({
      from: creds.fromName ? `"${creds.fromName}" <${creds.fromEmail}>` : creds.fromEmail,
      to,
      subject: subject || "Message from your institute",
      text: message,
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px">
        <p style="font-size:15px;line-height:1.6">${message.replace(/\n/g, "<br>")}</p>
      </div>`,
    });
    console.log(`[Automation] ✅ Email sent to ${to}`);
  } catch (err: any) {
    console.error(`[Automation] ❌ Email failed to ${to}:`, err.message);
  }
}

async function sendTwilio(creds: any, to: string, message: string, channel: "sms" | "whatsapp"): Promise<void> {
  if (!creds?.twilioAccountSid || !creds?.twilioAuthToken) {
    console.warn(`[Automation] ${channel}: missing Twilio credentials`);
    return;
  }
  const from = channel === "whatsapp" ? creds.twilioWhatsappNumber : creds.twilioPhoneNumber;
  if (!from) { console.warn(`[Automation] ${channel}: missing from number`); return; }
  if (!to) { console.warn(`[Automation] ${channel}: missing recipient number`); return; }

  try {
    // @ts-ignore — twilio is an optional runtime dependency
    const twilio = (await import("twilio")).default;
    const client = twilio(creds.twilioAccountSid, creds.twilioAuthToken);

    // Clean TO number
    let cleanTo = to.replace(/\D/g, "");
    if (cleanTo.startsWith("0")) cleanTo = cleanTo.slice(1);
    if (!cleanTo.startsWith("91") && cleanTo.length === 10) cleanTo = "91" + cleanTo;

    // Clean FROM number — remove spaces and fix format
    let cleanFrom = from.replace(/\s/g, ""); // remove all spaces

    let fromFormatted: string;
    let toFormatted: string;

    if (channel === "whatsapp") {
      // WhatsApp: from must have whatsapp: prefix
      fromFormatted = cleanFrom.startsWith("whatsapp:") ? cleanFrom : `whatsapp:${cleanFrom}`;
      toFormatted = `whatsapp:+${cleanTo}`;
    } else {
      // SMS: plain E.164 format
      fromFormatted = cleanFrom.startsWith("+") ? cleanFrom : `+${cleanFrom.replace(/^\+/, "")}`;
      toFormatted = `+${cleanTo}`;
    }

    await client.messages.create({ body: message, from: fromFormatted, to: toFormatted });
    console.log(`[Automation] ✅ ${channel} sent | from: ${fromFormatted} | to: ${toFormatted}`);
  } catch (err: any) {
    console.error(`[Automation] ❌ ${channel} failed to ${to}:`, err.message);
  }
}

export async function fireTrigger(
  triggerId: string, adminId: number,
  data: { name?: string; phone?: string; email?: string; course?: string; amount?: string; dueDate?: string; instituteName?: string; }
): Promise<void> {
  try {
    const triggerConfig = await getTriggerConfig(adminId, triggerId);
    if (!triggerConfig) {
      console.log(`[Automation] Trigger "${triggerId}" not configured/disabled for admin ${adminId}`);
      return;
    }
    if (!triggerConfig.channels || triggerConfig.channels.length === 0) {
      console.warn(`[Automation] Trigger "${triggerId}" has no channels selected`);
      return;
    }

    const vars: Record<string, string> = {
      name: data.name || "", phone: data.phone || "", email: data.email || "",
      course: data.course || "", amount: data.amount || "", due_date: data.dueDate || "",
      institute_name: data.instituteName || "Your Institute",
    };

    const message = fillTemplate(triggerConfig.template, vars);
    const subject = `Message from ${vars.institute_name}`;

    console.log(`[Automation] Firing "${triggerId}" for admin ${adminId} via channels: [${triggerConfig.channels.join(", ")}]`);

    for (const channel of triggerConfig.channels) {
      if (channel === "email") {
        const creds = await getCredentials(adminId, "email");
        if (creds && data.email) await sendEmail(creds, data.email, message, subject);
        else console.warn(`[Automation] Email: no creds or no email address`);
      } else if (channel === "sms") {
        const creds = await getCredentials(adminId, "sms");
        if (creds && data.phone) await sendTwilio(creds, data.phone, message, "sms");
        else console.warn(`[Automation] SMS: no creds or no phone`);
      } else if (channel === "whatsapp") {
        const creds = await getCredentials(adminId, "whatsapp");
        if (creds && data.phone) await sendTwilio(creds, data.phone, message, "whatsapp");
        else console.warn(`[Automation] WhatsApp: no creds or no phone`);
      }
    }
  } catch (err: any) {
    console.error(`[Automation] fireTrigger error (${triggerId}):`, err.message);
  }
}

export async function triggerNewLead(adminId: number, lead: {
  studentName: string; phone: string; email?: string | null;
  courseInterested?: string | null; instituteName?: string;
}): Promise<void> {
  await fireTrigger("new_lead", adminId, {
    name: lead.studentName, phone: lead.phone,
    email: lead.email || "",
    course: lead.courseInterested || "", instituteName: lead.instituteName,
  });
}

export async function triggerLeadConverted(adminId: number, student: {
  name: string; phone: string; email?: string | null; courseInterested?: string | null; instituteName?: string;
}): Promise<void> {
  await fireTrigger("lead_converted", adminId, {
    name: student.name, phone: student.phone, email: student.email || "",
    course: student.courseInterested || "", instituteName: student.instituteName,
  });
}

export async function triggerFeeDue(adminId: number, data: {
  name: string; phone: string; email?: string | null; amount: number; dueDate: Date; instituteName?: string;
}): Promise<void> {
  await fireTrigger("fee_due", adminId, {
    name: data.name, phone: data.phone, email: data.email || "",
    amount: `₹${data.amount.toLocaleString("en-IN")}`,
    dueDate: data.dueDate.toLocaleDateString("en-IN"),
    instituteName: data.instituteName,
  });
}

export async function triggerFeeOverdue(adminId: number, data: {
  name: string; phone: string; email?: string | null; amount: number; dueDate: Date; instituteName?: string;
}): Promise<void> {
  await fireTrigger("fee_overdue", adminId, {
    name: data.name, phone: data.phone, email: data.email || "",
    amount: `₹${data.amount.toLocaleString("en-IN")}`,
    dueDate: data.dueDate.toLocaleDateString("en-IN"),
    instituteName: data.instituteName,
  });
}
