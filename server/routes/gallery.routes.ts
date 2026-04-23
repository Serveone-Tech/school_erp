import { Router } from "express";
import { requireAuth } from "../controllers/auth.controller";
import { db } from "../db";
import { pool } from "../db";
import { gallery, cloudinaryConfigs, emailConfigs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, decrypt } from "../utils/crypto";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import nodemailer from "nodemailer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function getAdminId(req: any) { const s = req.session as any; return s.adminId ?? s.userId; }

// Auto-create tables on first import
pool.query(`
  CREATE TABLE IF NOT EXISTS cloudinary_configs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    cloud_name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

pool.query(`
  CREATE TABLE IF NOT EXISTS email_configs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    email_user TEXT NOT NULL,
    email_pass TEXT NOT NULL,
    email_from_name TEXT NOT NULL DEFAULT '',
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});

// ── Cloudinary Config ─────────────────────────────────────────────────────────

router.get("/cloudinary-status", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const [cfg] = await db.select().from(cloudinaryConfigs).where(eq(cloudinaryConfigs.adminId, adminId));
    res.json({ configured: !!cfg, verified: cfg?.isVerified ?? false });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/cloudinary-config", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { cloudName, apiKey, apiSecret } = req.body;
    if (!cloudName || !apiKey || !apiSecret) return res.status(400).json({ message: "All three Cloudinary fields are required" });

    // Test the credentials before saving
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    try {
      await cloudinary.api.ping();
    } catch {
      return res.status(400).json({ message: "Invalid Cloudinary credentials. Please check and try again." });
    }

    const values = {
      adminId,
      cloudName: encrypt(cloudName),
      apiKey: encrypt(apiKey),
      apiSecret: encrypt(apiSecret),
      isVerified: true,
      updatedAt: new Date(),
    };

    const existing = await db.select({ id: cloudinaryConfigs.id }).from(cloudinaryConfigs).where(eq(cloudinaryConfigs.adminId, adminId));
    if (existing.length > 0) {
      await db.update(cloudinaryConfigs).set(values).where(eq(cloudinaryConfigs.adminId, adminId));
    } else {
      await db.insert(cloudinaryConfigs).values(values);
    }

    res.json({ message: "Cloudinary connected successfully!" });
  } catch (err: any) {
    if (err.message?.includes("Invalid credentials") || err.message?.includes("Must supply")) {
      return res.status(400).json({ message: "Invalid Cloudinary credentials. Please check and try again." });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete("/cloudinary-config", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    await db.delete(cloudinaryConfigs).where(eq(cloudinaryConfigs.adminId, adminId));
    res.json({ message: "Cloudinary disconnected" });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Email SMTP Config ─────────────────────────────────────────────────────────

router.get("/email-status", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const [cfg] = await db.select().from(emailConfigs).where(eq(emailConfigs.adminId, adminId));
    if (!cfg) return res.json({ configured: false });
    res.json({ configured: true, verified: cfg.isVerified ?? false, emailUser: decrypt(cfg.emailUser), fromName: cfg.emailFromName });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/email-config", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { emailUser, emailFromName } = req.body;
    let { emailPass } = req.body;

    if (!emailUser) return res.status(400).json({ message: "Gmail address is required" });

    const [existing] = await db.select().from(emailConfigs).where(eq(emailConfigs.adminId, adminId));

    // If password blank and config exists, reuse the stored encrypted password
    if (!emailPass) {
      if (!existing) return res.status(400).json({ message: "App Password is required for first-time setup" });
      emailPass = decrypt(existing.emailPass);
    }

    // Test credentials before saving
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: emailUser, pass: emailPass } });
    try {
      await transporter.verify();
    } catch {
      return res.status(400).json({ message: "Invalid Gmail credentials. Check your App Password and make sure 2FA is enabled." });
    }

    const values = {
      adminId,
      emailUser: encrypt(emailUser),
      emailPass: encrypt(emailPass),
      emailFromName: emailFromName || "",
      isVerified: true,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(emailConfigs).set(values).where(eq(emailConfigs.adminId, adminId));
    } else {
      await db.insert(emailConfigs).values(values);
    }

    res.json({ message: "Email SMTP configured successfully!" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/email-config", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    await db.delete(emailConfigs).where(eq(emailConfigs.adminId, adminId));
    res.json({ message: "Email config removed" });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Upload File to Cloudinary ─────────────────────────────────────────────────

router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const adminId = getAdminId(req);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const [cfg] = await db.select().from(cloudinaryConfigs).where(eq(cloudinaryConfigs.adminId, adminId));
    if (!cfg) return res.status(400).json({ message: "Cloudinary not configured" });

    cloudinary.config({
      cloud_name: decrypt(cfg.cloudName),
      api_key: decrypt(cfg.apiKey),
      api_secret: decrypt(cfg.apiSecret),
    });

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "school_gallery", resource_type: "auto" },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file!.buffer);
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// ── Gallery CRUD ──────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const { branchId, category } = req.query as any;
    const conds: any[] = [eq(gallery.adminId, adminId)];
    if (branchId) conds.push(eq(gallery.branchId, Number(branchId)));
    if (category) conds.push(eq(gallery.category, category));
    const data = await db.select().from(gallery).where(and(...conds));
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.body.branchId ? Number(req.body.branchId) : null;
    const [item] = await db.insert(gallery).values({ ...req.body, adminId, branchId }).returning();
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(gallery).where(eq(gallery.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
