import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import helmet from "helmet";
import compression from "compression";
import { loginLimiter, globalLimiter } from "./middleware/rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startBackupScheduler } from "./utils/backup-scheduler";
import { backupRouter } from "./routes/backup.routes";
import { startNotificationScheduler } from "./utils/notification-scheduler";

const app = express();
const httpServer = createServer(app);

const isProduction = process.env.NODE_ENV === "production";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
    userBranchId?: number | null;
    userName?: string;
    userEmail?: string;
    userPermissions?: string[];
    adminId?: number;
    parentId?: number;
    parentAdminId?: number;
    parentStudentIds?: number[];
    parentActiveStudentId?: number;
  }
}

// Trust reverse proxy (nginx/caddy) for correct IP and protocol detection
app.set("trust proxy", 1);

// --- PERFORMANCE: Gzip compression ---
app.use(compression());

// --- SECURITY: HTTP Headers via Helmet ---
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// --- SECURITY: Rate Limiting ---
app.use("/api", globalLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/parent/login", loginLimiter);

// --- Body Parsing: 2MB limit ---
app.use(
  express.json({
    limit: "5mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

// --- Session Store ---
const PgSession = connectPgSimple(session);
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && isProduction) {
  console.error(
    "FATAL: SESSION_SECRET environment variable is not set in production!",
  );
  process.exit(1);
}

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: sessionSecret || "dev-only-secret-not-for-production",
    resave: false,
    saveUninitialized: false,
    proxy: true, // trust X-Forwarded-Proto from reverse proxy
    name: "bse.sid",
    cookie: {
      // "auto" = send cookie regardless of connection type, but add Secure flag only when
      // the connection is detected as HTTPS (via X-Forwarded-Proto or direct TLS).
      // Using `true` causes express-session to silently drop Set-Cookie when running behind
      // an SSL-terminating proxy that doesn't forward X-Forwarded-Proto.
      secure: "auto",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

// ── Backup router — must be registered after session middleware ───────────────
app.use("/api/backups", backupRouter);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse)
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      log(logLine);
    }
  });
  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (!isProduction) console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  if (isProduction) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5001", 10);
  const host = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";
  const listenOptions: Record<string, any> = { port, host };
  if (process.platform !== "win32") listenOptions.reusePort = true;
  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
    startBackupScheduler();
    startNotificationScheduler();
  });
})();
