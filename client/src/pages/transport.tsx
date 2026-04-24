import { apiFetch } from "@/lib/queryClient";
// client/src/pages/transport.tsx
import { useState, useEffect, useRef } from "react";
import { useBranch } from "@/contexts/branch";
import { BranchSelectField } from "@/components/branch-select-field";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Search, Trash2, Bus, MapPin, Copy, Check, Navigation, Signal, Settings, Cpu, Link2, Unlink, Eye, EyeOff } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function busIcon(active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${active ? "#10b981" : "#94a3b8"};
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:18px;
    ">🚌</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function LiveMap({ branchQuery }: { branchQuery: string }) {
  const mapRef = useRef<L.Map | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());

  const { data: locations = [], dataUpdatedAt } = useQuery({
    queryKey: ["/api/transport/locations", branchQuery],
    queryFn: () => apiFetch(`/api/transport/locations${branchQuery}`),
    refetchInterval: 12000,
  });

  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    mapRef.current = L.map(mapDivRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(mapRef.current);
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !Array.isArray(locations)) return;
    const map = mapRef.current;
    const existingIds = new Set(markersRef.current.keys());
    const activeRoutes = locations.filter((r: any) => r.gps);

    activeRoutes.forEach((r: any) => {
      const { lat, lng, isActive } = r.gps;
      const sourceLabel = r.gps.source === "traccar" ? "Traccar GPS" : r.gps.source === "webhook" ? "Hardware GPS" : "Driver Phone";
      const label = `<b>${r.routeName}</b><br/>${r.vehicleNo || "No vehicle"}<br/>${r.driverName || ""}<br/><small style="color:${isActive ? "#10b981" : "#94a3b8"}">${isActive ? "● Live" : "○ Last known"} · ${sourceLabel}</small>`;
      if (markersRef.current.has(r.id)) {
        const m = markersRef.current.get(r.id)!;
        m.setLatLng([lat, lng]);
        m.setIcon(busIcon(isActive));
        m.setPopupContent(label);
      } else {
        const m = L.marker([lat, lng], { icon: busIcon(isActive) }).addTo(map).bindPopup(label);
        markersRef.current.set(r.id, m);
      }
      existingIds.delete(r.id);
    });

    existingIds.forEach(id => {
      markersRef.current.get(id)?.remove();
      markersRef.current.delete(id);
    });

    if (activeRoutes.length > 0 && markersRef.current.size > 0) {
      const group = L.featureGroup(Array.from(markersRef.current.values()));
      map.fitBounds(group.getBounds().pad(0.3));
    }
  }, [dataUpdatedAt]);

  const active = Array.isArray(locations) ? locations.filter((r: any) => r.gps?.isActive).length : 0;
  const total = Array.isArray(locations) ? locations.filter((r: any) => r.gps).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">{active} Live</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <Signal className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">{total} tracked today</span>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">Auto-refreshes every 12s</span>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ height: "480px" }}>
        <div ref={mapDivRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {/* Vehicles list below map */}
      {Array.isArray(locations) && locations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((r: any) => (
            <div key={r.id} className={`bg-card rounded-xl border p-3 flex items-center gap-3 ${r.gps?.isActive ? "border-emerald-200" : "border-border/50"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${r.gps?.isActive ? "bg-emerald-100" : "bg-slate-100"}`}>🚌</div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{r.routeName}</p>
                <p className="text-xs text-muted-foreground truncate">{r.vehicleNo || "—"} · {r.driverName || "No driver"}</p>
                {r.gps ? (
                  <p className={`text-xs font-medium mt-0.5 ${r.gps.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                    {r.gps.isActive ? "● Live" : `○ ${Math.round((Date.now() - r.gps.updatedAt) / 60000)}m ago`}
                    {r.gps.speed != null && ` · ${Math.round(r.gps.speed)} km/h`}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 mt-0.5">Not tracking</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(locations) && locations.length === 0 && (
        <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No vehicles tracking yet</p>
          <p className="text-sm mt-1">Share a tracking link with your driver, or configure a hardware GPS device</p>
        </div>
      )}
    </div>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={copy}>
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "GPS Link"}
    </Button>
  );
}

function GpsSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);

  const { data: cfg } = useQuery({
    queryKey: ["/api/transport/gps-config"],
    queryFn: () => apiFetch("/api/transport/gps-config"),
    enabled: open,
  });

  const [form, setForm] = useState<any>({ provider: "none", traccarUrl: "", traccarEmail: "", traccarPassword: "" });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (cfg) setForm({ provider: cfg.provider, traccarUrl: cfg.traccarUrl || "", traccarEmail: cfg.traccarEmail || "", traccarPassword: "" });
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/transport/gps-config", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, ...(data.traccarPassword ? {} : { traccarPassword: undefined }) }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport/gps-config"] });
      toast({ title: "GPS settings saved" });
      onClose();
    },
  });

  const webhookUrl = `${window.location.origin}/api/transport/webhook/{IMEI}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-4 h-4" />GPS Platform Settings</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">GPS Provider</Label>
            <Select value={form.provider} onValueChange={v => set("provider", v)}>
              <SelectTrigger className="rounded-xl h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Driver phone only)</SelectItem>
                <SelectItem value="traccar">Traccar Server (Hardware GPS)</SelectItem>
                <SelectItem value="webhook">HTTP Webhook (GPS device push)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.provider === "traccar" && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs text-blue-700 font-medium">Traccar is an open-source GPS server supporting 200+ device brands.</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Traccar Server URL</Label>
                <Input value={form.traccarUrl} onChange={e => set("traccarUrl", e.target.value)} placeholder="http://your-traccar-server.com" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={form.traccarEmail} onChange={e => set("traccarEmail", e.target.value)} placeholder="admin@example.com" className="rounded-xl h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Password {cfg?.hasPassword ? "(leave blank to keep current)" : ""}</Label>
                <div className="relative">
                  <Input value={form.traccarPassword} onChange={e => set("traccarPassword", e.target.value)} type={showPassword ? "text" : "password"} placeholder={cfg?.hasPassword ? "••••••••" : "Password"} className="rounded-xl h-9 pr-9" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-blue-600">After saving, link each vehicle to a Traccar Device ID using the "Link Device" button on the route card.</p>
            </div>
          )}

          {form.provider === "webhook" && (
            <div className="space-y-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs text-amber-800 font-medium">Configure your GPS device to POST to this URL:</p>
              <div className="bg-white rounded-lg border p-3 font-mono text-xs break-all text-slate-700">{webhookUrl}</div>
              <p className="text-xs text-amber-700">Replace <code className="bg-amber-100 px-1 rounded">{"{IMEI}"}</code> with the device's IMEI number. Then link each vehicle to its IMEI using the "Link Device" button.</p>
              <div className="text-xs text-amber-700 space-y-1">
                <p className="font-medium">Supported POST body fields:</p>
                <p><code className="bg-amber-100 px-1 rounded">lat</code> / <code className="bg-amber-100 px-1 rounded">latitude</code> — latitude</p>
                <p><code className="bg-amber-100 px-1 rounded">lng</code> / <code className="bg-amber-100 px-1 rounded">lon</code> / <code className="bg-amber-100 px-1 rounded">longitude</code> — longitude</p>
                <p><code className="bg-amber-100 px-1 rounded">speed</code> — speed in km/h (optional)</p>
                <p><code className="bg-amber-100 px-1 rounded">heading</code> / <code className="bg-amber-100 px-1 rounded">course</code> — direction (optional)</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LinkDeviceModal({ route, open, onClose }: { route: any; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deviceId, setDeviceId] = useState(route?.gpsDeviceId || "");

  useEffect(() => { setDeviceId(route?.gpsDeviceId || ""); }, [route]);

  const { data: cfg } = useQuery({ queryKey: ["/api/transport/gps-config"], queryFn: () => apiFetch("/api/transport/gps-config") });

  const saveMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/transport/${route.id}/gps-device`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpsDeviceId: id || null }),
    }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/transport"] });
      toast({ title: deviceId ? "Device linked" : "Device unlinked" });
      onClose();
    },
  });

  const provider = cfg?.provider || "none";
  const label = provider === "traccar" ? "Traccar Device ID" : "Device IMEI";
  const placeholder = provider === "traccar" ? "e.g. 1 (numeric ID from Traccar)" : "e.g. 123456789012345";
  const hint = provider === "traccar"
    ? "Find the Device ID in your Traccar admin panel → Devices list."
    : provider === "webhook"
    ? "Enter the IMEI printed on your GPS hardware device."
    : "Set a GPS provider first in GPS Settings to use hardware GPS devices.";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />Link GPS Device
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs font-medium text-slate-700">{route?.routeName}</p>
            <p className="text-xs text-slate-500">{route?.vehicleNo || "No vehicle number"}</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <Input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder={placeholder} className="rounded-xl h-9" disabled={provider === "none"} />
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            {route?.gpsDeviceId && (
              <Button variant="outline" className="gap-1 text-destructive hover:text-destructive" onClick={() => { setDeviceId(""); saveMutation.mutate(""); }}>
                <Unlink className="w-3.5 h-3.5" />Unlink
              </Button>
            )}
            <Button className="flex-1" onClick={() => saveMutation.mutate(deviceId)} disabled={saveMutation.isPending || provider === "none"}>
              {saveMutation.isPending ? "Saving..." : "Link Device"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TransportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [gpsSettingsOpen, setGpsSettingsOpen] = useState(false);
  const [linkDeviceRoute, setLinkDeviceRoute] = useState<any>(null);
  const { selectedBranchId, branchQuery } = useBranch();
  const [form, setForm] = useState<any>({ branchId: selectedBranchId ?? null });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: routes = [], isLoading } = useQuery({ queryKey: ["/api/transport", selectedBranchId], queryFn: () => apiFetch(`/api/transport${branchQuery}`) });
  const { data: gpsCfg } = useQuery({ queryKey: ["/api/transport/gps-config"], queryFn: () => apiFetch("/api/transport/gps-config") });

  const createMutation = useMutation({
    mutationFn: (data: any) => fetch("/api/transport", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, monthlyFee: Number(data.monthlyFee || 0), capacity: Number(data.capacity || 0) }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/transport"] }); toast({ title: "Route added" }); setAddOpen(false); setForm({ branchId: selectedBranchId ?? null }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/transport/${id}`, { method: "DELETE", credentials: "include" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/transport"] }); toast({ title: "Route deleted" }); },
  });

  const filtered = routes.filter((r: any) => !search || r.routeName?.toLowerCase().includes(search.toLowerCase()) || r.vehicleNo?.includes(search));
  const trackingBase = `${window.location.origin}/driver-track`;

  const providerBadge = gpsCfg?.provider === "traccar"
    ? { label: "Traccar", color: "bg-blue-100 text-blue-700 border-blue-200" }
    : gpsCfg?.provider === "webhook"
    ? { label: "Webhook", color: "bg-amber-100 text-amber-700 border-amber-200" }
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bus className="w-6 h-6 text-primary" />Transport Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{routes.length} routes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl h-9" onClick={() => setGpsSettingsOpen(true)}>
            <Settings className="w-3.5 h-3.5" />GPS Settings
            {providerBadge && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded border ${providerBadge.color}`}>{providerBadge.label}</span>}
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />Add Route</Button>
        </div>
      </div>

      <Tabs defaultValue="routes">
        <TabsList className="h-9">
          <TabsTrigger value="routes" className="text-xs gap-1.5"><Bus className="w-3.5 h-3.5" />Routes ({routes.length})</TabsTrigger>
          <TabsTrigger value="map" className="text-xs gap-1.5"><MapPin className="w-3.5 h-3.5" />Live GPS Map</TabsTrigger>
        </TabsList>

        <TabsContent value="routes" className="mt-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search routes..." className="pl-9 rounded-xl" />
          </div>

          {isLoading ? <div className="text-center py-12 text-muted-foreground">Loading...</div>
          : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border/50">
              <Bus className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No routes added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r: any) => (
                <div key={r.id} className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{r.routeName}</p>
                      <Badge variant="outline" className="text-xs mt-1">{r.vehicleNo || "No Vehicle"}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { if (await confirm({ title: "Delete Route", description: `Remove route "${r.routeName}"? This cannot be undone.`, confirmLabel: "Delete", variant: "destructive" })) deleteMutation.mutate(r.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {r.driverName && <p>Driver: <span className="text-foreground font-medium">{r.driverName}</span></p>}
                    {r.driverPhone && <p>Phone: <span className="text-foreground">{r.driverPhone}</span></p>}
                    {r.capacity && <p>Capacity: <span className="text-foreground">{r.capacity} seats</span></p>}
                    {r.monthlyFee && <p>Monthly Fee: <span className="text-foreground font-semibold">₹{r.monthlyFee.toLocaleString("en-IN")}</span></p>}
                  </div>
                  {r.stops && <div className="text-xs"><p className="font-medium mb-1 text-muted-foreground">Stops:</p><p className="text-foreground">{r.stops}</p></div>}

                  {/* GPS Section */}
                  <div className="pt-2 border-t border-border/40 space-y-2">
                    {/* Hardware GPS device */}
                    {gpsCfg?.provider !== "none" && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Cpu className="w-3 h-3" />
                          {r.gpsDeviceId ? (
                            <span className="text-emerald-600 font-medium">Device: {r.gpsDeviceId}</span>
                          ) : (
                            <span>No device linked</span>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => setLinkDeviceRoute(r)}>
                          <Link2 className="w-3 h-3" />{r.gpsDeviceId ? "Change" : "Link Device"}
                        </Button>
                      </div>
                    )}
                    {/* Driver phone tracking */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Navigation className="w-3 h-3" />
                        <span>Driver Phone</span>
                      </div>
                      <CopyLinkButton url={`${trackingBase}/${r.id}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <LiveMap branchQuery={branchQuery} />
        </TabsContent>
      </Tabs>

      {/* Add Route Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader><DialogTitle>Add Transport Route</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs">Route Name *</Label><Input value={form.routeName || ""} onChange={e => set("routeName", e.target.value)} placeholder="Route A - City Center" className="rounded-xl h-9" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Vehicle No.</Label><Input value={form.vehicleNo || ""} onChange={e => set("vehicleNo", e.target.value)} placeholder="MP 09 AB 1234" className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Capacity</Label><Input type="number" value={form.capacity || ""} onChange={e => set("capacity", e.target.value)} placeholder="40" className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Driver Name</Label><Input value={form.driverName || ""} onChange={e => set("driverName", e.target.value)} className="rounded-xl h-9" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Driver Phone</Label><Input value={form.driverPhone || ""} onChange={e => set("driverPhone", e.target.value)} className="rounded-xl h-9" type="tel" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Monthly Fee (₹)</Label><Input type="number" value={form.monthlyFee || ""} onChange={e => set("monthlyFee", e.target.value)} className="rounded-xl h-9" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Stops (comma separated)</Label><Input value={form.stops || ""} onChange={e => set("stops", e.target.value)} placeholder="Stop 1, Stop 2, Stop 3" className="rounded-xl h-9" /></div>
            <BranchSelectField value={form.branchId} onChange={v => set("branchId", v)} />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.routeName}>{createMutation.isPending ? "Saving..." : "Add Route"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GpsSettingsModal open={gpsSettingsOpen} onClose={() => setGpsSettingsOpen(false)} />
      {linkDeviceRoute && (
        <LinkDeviceModal route={linkDeviceRoute} open={!!linkDeviceRoute} onClose={() => setLinkDeviceRoute(null)} />
      )}
      {ConfirmDialog}
    </div>
  );
}
