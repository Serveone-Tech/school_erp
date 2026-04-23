import { Router } from "express";
import { requireAuth, requireAdmin } from "../controllers/auth.controller";
import { storage } from "../storage";
import { gpsStore, setVehicleLocation, getGpsConfig, saveGpsConfig, restartPolling } from "../utils/gps-tracker";
import { db } from "../db";
import { transportRoutes } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

function getAdminId(req: any) {
  const s = req.session as any;
  return s.adminId ?? s.userId;
}

// ── GPS Config endpoints ────────────────────────────────────────────────────────

router.get("/gps-config", requireAuth, (req, res) => {
  res.json(getGpsConfig());
});

router.post("/gps-config", requireAuth, requireAdmin, (req, res) => {
  const config = saveGpsConfig(req.body);
  const { traccarPassword, ...safe } = config as any;
  res.json({ ...safe, hasPassword: !!traccarPassword });
});

// ── GPS Location endpoints ─────────────────────────────────────────────────────

// Public: driver phone app posts location
router.post("/location/:routeId", async (req, res) => {
  const routeId = Number(req.params.routeId);
  const { lat, lng, speed, heading } = req.body;
  if (!lat || !lng || isNaN(routeId)) return res.status(400).json({ message: "lat, lng required" });
  setVehicleLocation(routeId, { lat: Number(lat), lng: Number(lng), speed, heading, source: "phone" });
  res.json({ ok: true });
});

// Public: HTTP Push webhook from hardware GPS device (IMEI-based)
router.post("/webhook/:imei", async (req, res) => {
  try {
    const imei = req.params.imei;
    const body = req.body;

    // Support common GPS device POST formats
    const lat = Number(body.lat ?? body.latitude ?? body.Lat ?? body.LATITUDE);
    const lng = Number(body.lng ?? body.lon ?? body.longitude ?? body.Lng ?? body.LONGITUDE);
    const speed = body.speed != null ? Number(body.speed) : undefined;
    const heading = body.heading ?? body.course ?? body.direction ?? undefined;

    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "lat/lng required" });
    }

    // Find route by gpsDeviceId matching IMEI
    const [route] = await db.select({ id: transportRoutes.id })
      .from(transportRoutes)
      .where(eq(transportRoutes.gpsDeviceId, imei));

    if (!route) return res.status(404).json({ message: "No route linked to this device" });

    setVehicleLocation(route.id, { lat, lng, speed, heading, source: "webhook" });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Public: driver app fetches route info
router.get("/public/:routeId", async (req, res) => {
  try {
    const routeId = Number(req.params.routeId);
    const [route] = await db.select({
      id: transportRoutes.id,
      routeName: transportRoutes.routeName,
      vehicleNo: transportRoutes.vehicleNo,
      driverName: transportRoutes.driverName,
    }).from(transportRoutes).where(eq(transportRoutes.id, routeId));
    if (!route) return res.status(404).json({ message: "Route not found" });
    res.json(route);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// Admin: all routes with GPS locations
router.get("/locations", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const routes = await storage.getTransportRoutes({ adminId, branchId });
    const TWO_MIN = 2 * 60 * 1000;
    const result = routes.map((r: any) => {
      const loc = gpsStore.get(r.id);
      return { ...r, gps: loc ? { ...loc, isActive: (Date.now() - loc.updatedAt) < TWO_MIN } : null };
    });
    res.json(result);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

// Admin: link/unlink GPS device to a route
router.put("/:id/gps-device", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { gpsDeviceId } = req.body;
    await db.update(transportRoutes)
      .set({ gpsDeviceId: gpsDeviceId || null })
      .where(eq(transportRoutes.id, Number(req.params.id)));
    restartPolling();
    res.json({ ok: true });
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

// ── Standard CRUD ──────────────────────────────────────────────────────────────

router.get("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
    const data = await storage.getTransportRoutes({ adminId, branchId });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const all = await storage.getTransportRoutes({ adminId });
    const data = all.find((r: any) => r.id === Number(req.params.id));
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err: any) { res.status(500).json({ message: err.message }); }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const adminId = getAdminId(req);
    const item = await storage.createTransportRoute({ ...req.body, adminId });
    res.status(201).json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const item = await storage.updateTransportRoute(Number(req.params.id), req.body);
    res.json(item);
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await storage.deleteTransportRoute(Number(req.params.id));
    res.status(204).send();
  } catch (err: any) { res.status(400).json({ message: err.message }); }
});

export default router;
