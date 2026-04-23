import rateLimit from "express-rate-limit";

export interface BlockedIPEntry {
  ip: string;
  blockedAt: string;
  attempts: number;
}

const blockedIPsMap = new Map<string, BlockedIPEntry>();
const unlockedIPs = new Set<string>();
const WINDOW_MS = 15 * 60 * 1000;

export const loginLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "";
    return unlockedIPs.has(ip);
  },
  handler: (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const existing = blockedIPsMap.get(ip);
    blockedIPsMap.set(ip, {
      ip,
      blockedAt: existing?.blockedAt || new Date().toISOString(),
      attempts: (existing?.attempts ?? 0) + 1,
    });
    res.status(429).json({ message: "Too many login attempts. Please wait 15 minutes and try again." });
  },
});

export const globalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

export function getBlockedIPs(): BlockedIPEntry[] {
  const now = Date.now();
  for (const [ip, data] of Array.from(blockedIPsMap.entries())) {
    if (now - new Date(data.blockedAt).getTime() > WINDOW_MS) {
      blockedIPsMap.delete(ip);
    }
  }
  return Array.from(blockedIPsMap.values());
}

export function unblockIP(ip: string): boolean {
  if (!blockedIPsMap.has(ip)) return false;
  blockedIPsMap.delete(ip);
  unlockedIPs.add(ip);
  try { (loginLimiter as any).resetKey?.(ip); } catch {}
  setTimeout(() => unlockedIPs.delete(ip), WINDOW_MS);
  return true;
}
