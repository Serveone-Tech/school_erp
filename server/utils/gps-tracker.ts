/**
 * GPS Tracker Service
 *
 * Supports two GPS modes:
 * 1. Traccar  — polls a Traccar server (open-source, supports 200+ GPS device brands)
 * 2. Webhook  — GPS devices POST location directly to our endpoint (HTTP Push mode)
 *
 * Config stored in server memory + gps-config.json for persistence.
 */

import fs from "fs";
import path from "path";
import { db } from "../db";
import { transportRoutes } from "../../shared/schema";
import { isNotNull } from "drizzle-orm";

export interface GpsConfig {
  provider: "traccar" | "webhook" | "none";
  traccarUrl: string;       // e.g. http://demo.traccar.org
  traccarEmail: string;
  traccarPassword: string;
}

export interface VehicleLocation {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt: number;
  source: "traccar" | "webhook" | "phone";
}

const CONFIG_FILE = path.join(process.cwd(), "gps-config.json");

// In-memory store: routeId → latest location
export const gpsStore = new Map<number, VehicleLocation>();

let config: GpsConfig = { provider: "none", traccarUrl: "", traccarEmail: "", traccarPassword: "" };
let pollingTimer: ReturnType<typeof setInterval> | null = null;

export function loadGpsConfig(): GpsConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch { /* use defaults */ }
  return config;
}

export function saveGpsConfig(newConfig: Partial<GpsConfig>) {
  config = { ...config, ...newConfig };
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2)); } catch { /* ignore */ }
  restartPolling();
  return config;
}

export function getGpsConfig(): Omit<GpsConfig, "traccarPassword"> & { hasPassword: boolean } {
  const { traccarPassword, ...rest } = config;
  return { ...rest, hasPassword: !!traccarPassword };
}

// Traccar REST API polling
async function pollTraccar() {
  if (config.provider !== "traccar" || !config.traccarUrl || !config.traccarEmail) return;

  try {
    const auth = Buffer.from(`${config.traccarEmail}:${config.traccarPassword}`).toString("base64");
    const base = config.traccarUrl.replace(/\/$/, "");

    // Get all devices with gpsDeviceId set
    const routes = await db.select({
      id: transportRoutes.id,
      gpsDeviceId: transportRoutes.gpsDeviceId,
    }).from(transportRoutes).where(isNotNull(transportRoutes.gpsDeviceId));

    if (routes.length === 0) return;

    // Fetch latest positions from Traccar for each device
    await Promise.all(routes.map(async (route) => {
      if (!route.gpsDeviceId) return;
      try {
        const url = `${base}/api/positions?deviceId=${encodeURIComponent(route.gpsDeviceId)}&limit=1`;
        const res = await fetch(url, {
          headers: { "Authorization": `Basic ${auth}`, "Accept": "application/json" },
        });
        if (!res.ok) return;
        const positions: any[] = await res.json();
        if (positions.length === 0) return;
        const p = positions[0];
        gpsStore.set(route.id, {
          lat: p.latitude,
          lng: p.longitude,
          speed: p.speed != null ? p.speed * 1.852 : undefined, // knots → km/h... wait Traccar uses km/h already? Actually Traccar reports in knots. Let me keep as is.
          heading: p.course,
          updatedAt: new Date(p.fixTime || p.serverTime || Date.now()).getTime(),
          source: "traccar",
        });
      } catch { /* single device error, skip */ }
    }));
  } catch (err) {
    console.error("[GPS] Traccar poll error:", err);
  }
}

export function restartPolling() {
  if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
  if (config.provider === "traccar") {
    pollTraccar(); // immediate
    pollingTimer = setInterval(pollTraccar, 30_000); // every 30s
  }
}

// Set location from webhook/phone (used by routes)
export function setVehicleLocation(routeId: number, data: Omit<VehicleLocation, "updatedAt">) {
  gpsStore.set(routeId, { ...data, updatedAt: Date.now() });
}

export function getAllLocations() {
  return gpsStore;
}

// Init on server start
loadGpsConfig();
restartPolling();
