import { Router } from "express";
import type { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { runBackup, listBackups } from "../utils/backup";

const backupRouter = Router();

// ── Simple session check — requireAuth ki jagah ───────────────────────────────
function checkAuth(req: Request, res: Response, next: Function) {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ── GET /api/backups — list all backups ───────────────────────────────────────
backupRouter.get("/", checkAuth, (req: Request, res: Response) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (err) {
    res.status(500).json({ message: "Failed to list backups" });
  }
});

// ── POST /api/backups/run — manual backup trigger ─────────────────────────────
backupRouter.post("/run", checkAuth, async (req: Request, res: Response) => {
  try {
    const zipPath = await runBackup();
    const backups = listBackups();
    res.json({
      message: "Backup created successfully",
      file: path.basename(zipPath),
      totalBackups: backups.length,
    });
  } catch (err) {
    console.error("[Backup Route] Error:", err);
    res.status(500).json({ message: "Backup failed" });
  }
});

// ── GET /api/backups/download/:filename — download backup ZIP ─────────────────
backupRouter.get(
  "/download/:filename",
  checkAuth,
  (req: Request, res: Response) => {
    try {
      const filename = String(req.params.filename);

      // Security: only allow backup_ prefixed .zip files
      if (!filename.startsWith("backup_") || !filename.endsWith(".zip")) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      const filePath = path.join(process.cwd(), "backups", filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Backup not found" });
      }

      res.download(filePath, filename);
    } catch (err) {
      res.status(500).json({ message: "Download failed" });
    }
  },
);

export { backupRouter };
