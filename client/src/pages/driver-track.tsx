// client/src/pages/driver-track.tsx
import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Wifi, WifiOff, Bus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DriverTrackPage() {
  const routeId = Number(window.location.pathname.split("/driver-track/")[1]);

  const [route, setRoute] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "tracking" | "error" | "denied">("idle");
  const [lastPos, setLastPos] = useState<{ lat: number; lng: number; speed?: number } | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const [error, setError] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<any>(null);
  const pendingPos = useRef<GeolocationPosition | null>(null);

  useEffect(() => {
    if (!routeId) return;
    fetch(`/api/transport/public/${routeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRoute(data); });
  }, [routeId]);

  const sendLocation = async (pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, speed, heading } = pos.coords;
    try {
      await fetch(`/api/transport/location/${routeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, speed: speed ?? undefined, heading: heading ?? undefined }),
      });
      setLastPos({ lat, lng, speed: speed ?? undefined });
      setSendCount(c => c + 1);
    } catch {
      // network error — will retry
    }
  };

  const startTracking = () => {
    if (!("geolocation" in navigator)) {
      setError("GPS not supported on this device.");
      setStatus("error");
      return;
    }
    setStatus("tracking");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => { pendingPos.current = pos; },
      (err) => {
        if (err.code === 1) setStatus("denied");
        else setStatus("error");
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    // Send every 10 seconds
    intervalRef.current = setInterval(() => {
      if (pendingPos.current) sendLocation(pendingPos.current);
    }, 10000);
    // Send immediately too
    navigator.geolocation.getCurrentPosition(pos => { pendingPos.current = pos; sendLocation(pos); }, () => {});
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchIdRef.current = null;
    intervalRef.current = null;
    setStatus("idle");
  };

  useEffect(() => () => stopTracking(), []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center mx-auto mb-4">
            <Bus className="w-8 h-8 text-blue-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vehicle GPS Tracking</h1>
          <p className="text-blue-300 text-sm mt-1">School Transport System</p>
        </div>

        {/* Route Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-5 space-y-3">
          {route ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <Navigation className="w-5 h-5 text-blue-200" />
                </div>
                <div>
                  <p className="font-semibold text-white text-base">{route.routeName}</p>
                  <p className="text-blue-300 text-xs">{route.vehicleNo || "No Vehicle No."}</p>
                </div>
              </div>
              {route.driverName && (
                <p className="text-xs text-blue-300 pl-1">Driver: <span className="text-white font-medium">{route.driverName}</span></p>
              )}
            </>
          ) : (
            <p className="text-blue-300 text-sm text-center py-2">Loading route info...</p>
          )}
        </div>

        {/* Status */}
        <div className={`rounded-2xl border p-5 text-center space-y-1 ${
          status === "tracking" ? "bg-emerald-500/20 border-emerald-400/30" :
          status === "denied" || status === "error" ? "bg-red-500/20 border-red-400/30" :
          "bg-white/10 border-white/20"
        }`}>
          {status === "idle" && (
            <>
              <Wifi className="w-7 h-7 text-blue-300 mx-auto" />
              <p className="text-white font-medium">Tracking Inactive</p>
              <p className="text-blue-300 text-xs">Press Start to begin sharing your location</p>
            </>
          )}
          {status === "tracking" && (
            <>
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-emerald-300 font-semibold text-lg">Tracking Active</p>
              </div>
              {lastPos && (
                <p className="text-emerald-200 text-xs mt-1">
                  {lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}
                  {lastPos.speed != null && ` · ${Math.round((lastPos.speed || 0) * 3.6)} km/h`}
                </p>
              )}
              <p className="text-emerald-300/60 text-xs">Updates sent: {sendCount} · every 10 sec</p>
            </>
          )}
          {status === "denied" && (
            <>
              <AlertCircle className="w-7 h-7 text-red-400 mx-auto" />
              <p className="text-red-300 font-medium">Location Access Denied</p>
              <p className="text-red-300/70 text-xs">Please allow location permission in browser settings</p>
            </>
          )}
          {status === "error" && (
            <>
              <WifiOff className="w-7 h-7 text-red-400 mx-auto" />
              <p className="text-red-300 font-medium">GPS Error</p>
              <p className="text-red-300/70 text-xs">{error || "Unable to get location"}</p>
            </>
          )}
        </div>

        {/* Button */}
        {status === "tracking" ? (
          <Button onClick={stopTracking} className="w-full h-14 rounded-2xl text-base font-semibold bg-red-500 hover:bg-red-600 border-0">
            Stop Tracking
          </Button>
        ) : (
          <Button onClick={startTracking} className="w-full h-14 rounded-2xl text-base font-semibold bg-emerald-500 hover:bg-emerald-600 border-0" disabled={!route}>
            <MapPin className="w-5 h-5 mr-2" />
            Start Tracking
          </Button>
        )}

        <p className="text-center text-blue-400/50 text-xs">Keep this page open while driving</p>
      </div>
    </div>
  );
}
