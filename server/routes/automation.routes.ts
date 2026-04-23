// server/routes/automation.routes.ts — NEW FILE
import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { automationCredentials, automationTriggers } from "@shared/schema";

const router = Router();

function getAdminId(req: any): number {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

// GET credentials
router.get("/credentials", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const rows = await db.select().from(automationCredentials)
      .where(eq(automationCredentials.adminId, adminId));

    const result: Record<string, any> = {};
    for (const row of rows) {
      try {
        const config = JSON.parse(row.config);
        result[row.channel] = {
          enabled: row.enabled,
          sendgridApiKey: config.sendgridApiKey ? config.sendgridApiKey.substring(0, 8) + "••••••" : undefined,
          fromEmail: config.fromEmail,
          fromName: config.fromName,
          twilioAccountSid: config.twilioAccountSid,
          twilioAuthToken: config.twilioAuthToken ? config.twilioAuthToken.substring(0, 6) + "••••••" : undefined,
          twilioPhoneNumber: config.twilioPhoneNumber,
          twilioWhatsappNumber: config.twilioWhatsappNumber,
        };
      } catch { }
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT credentials
router.put("/credentials", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const schema = z.object({
      channel: z.enum(["email", "sms", "whatsapp"]),
      config: z.object({
        enabled: z.boolean(),
        sendgridApiKey: z.string().optional(),
        fromEmail: z.string().optional(),
        fromName: z.string().optional(),
        twilioAccountSid: z.string().optional(),
        twilioAuthToken: z.string().optional(),
        twilioPhoneNumber: z.string().optional(),
        twilioWhatsappNumber: z.string().optional(),
      }),
    });

    const { channel, config } = schema.parse(req.body);
    const { enabled, ...rest } = config;

    // Fetch existing to preserve masked values
    const [existing] = await db.select().from(automationCredentials)
      .where(and(eq(automationCredentials.adminId, adminId), eq(automationCredentials.channel, channel)));

    let finalConfig = { ...rest };
    if (existing) {
      const existingConfig = JSON.parse(existing.config);
      if (rest.sendgridApiKey?.includes("••")) finalConfig.sendgridApiKey = existingConfig.sendgridApiKey;
      if (rest.twilioAuthToken?.includes("••")) finalConfig.twilioAuthToken = existingConfig.twilioAuthToken;
    }

    const configStr = JSON.stringify(finalConfig);

    if (existing) {
      await db.update(automationCredentials)
        .set({ config: configStr, enabled, updatedAt: new Date() })
        .where(and(eq(automationCredentials.adminId, adminId), eq(automationCredentials.channel, channel)));
    } else {
      await db.insert(automationCredentials).values({ adminId, channel, config: configStr, enabled });
    }

    res.json({ success: true, message: `${channel} credentials saved` });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: err.message });
  }
});

// GET triggers
router.get("/triggers", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const rows = await db.select().from(automationTriggers)
      .where(eq(automationTriggers.adminId, adminId));

    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.triggerId] = {
        enabled: row.enabled,
        channels: row.channels || [],
        template: row.template || "",
      };
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// PUT triggers
router.put("/triggers", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const schema = z.object({
      triggerId: z.string(),
      config: z.object({
        enabled: z.boolean(),
        channels: z.array(z.string()),
        template: z.string().optional(),
      }),
    });

    const { triggerId, config } = schema.parse(req.body);

    const [existing] = await db.select().from(automationTriggers)
      .where(and(eq(automationTriggers.adminId, adminId), eq(automationTriggers.triggerId, triggerId)));

    if (existing) {
      await db.update(automationTriggers)
        .set({ enabled: config.enabled, channels: config.channels, template: config.template || null, updatedAt: new Date() })
        .where(and(eq(automationTriggers.adminId, adminId), eq(automationTriggers.triggerId, triggerId)));
    } else {
      await db.insert(automationTriggers)
        .values({ adminId, triggerId, enabled: config.enabled, channels: config.channels, template: config.template || null });
    }

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: err.message });
  }
});

// POST manual send
router.post("/send", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const schema = z.object({
      channel: z.enum(["email", "sms", "whatsapp"]),
      to: z.string().min(1),
      subject: z.string().optional(),
      message: z.string().min(1),
    });

    const { channel, to, subject, message } = schema.parse(req.body);

    const [credRow] = await db.select().from(automationCredentials)
      .where(and(eq(automationCredentials.adminId, adminId), eq(automationCredentials.channel, channel)));

    if (!credRow || !credRow.enabled) {
      return res.status(400).json({ message: `${channel} is not configured or disabled` });
    }

    const creds = JSON.parse(credRow.config);

    if (channel === "email") {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: "smtp.sendgrid.net", port: 587,
        auth: { user: "apikey", pass: creds.sendgridApiKey },
      });
      await transporter.sendMail({
        from: creds.fromName ? `"${creds.fromName}" <${creds.fromEmail}>` : creds.fromEmail,
        to, subject: subject || "Message from your institute", text: message,
      });
    } else {
      const from = channel === "whatsapp" ? creds.twilioWhatsappNumber : creds.twilioPhoneNumber;
      // @ts-ignore — twilio is an optional runtime dependency
      const twilio = (await import("twilio")).default;
      const client = twilio(creds.twilioAccountSid, creds.twilioAuthToken);
      let cleanTo = to.replace(/\D/g, "");
      if (cleanTo.startsWith("0")) cleanTo = cleanTo.slice(1);
      if (!cleanTo.startsWith("91") && cleanTo.length === 10) cleanTo = "91" + cleanTo;
      const toFormatted = channel === "whatsapp" ? `whatsapp:+${cleanTo}` : `+${cleanTo}`;
      await client.messages.create({ body: message, from, to: toFormatted });
    }

    res.json({ success: true, message: "Message sent successfully" });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: err.message });
  }
});

export default router;
