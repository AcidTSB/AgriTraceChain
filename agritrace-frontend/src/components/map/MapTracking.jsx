import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix the default Leaflet marker icon broken by bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

const ACTION_COLORS = {
  PLANTING: "#16a34a",
  FERTILIZING: "#ca8a04",
  WATERING: "#0891b2",
  SPRAYING: "#7c3aed",
  HARVESTING: "#ea580c",
  PACKAGING: "#2563eb",
  SHIPPING: "#be123c",
  INSPECTION: "#059669",
};

function createCustomIcon(action) {
  const color = ACTION_COLORS[action] ?? "#64748b";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="${color}" stroke="white" stroke-width="2"
        d="M16 2C9.37 2 4 7.37 4 14c0 9.75 12 26 12 26S28 23.75 28 14C28 7.37 22.63 2 16 2z"/>
      <circle cx="16" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
  });
}

function formatTs(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleString("vi-VN");
}

export function MapTracking({ logs = [] }) {
  // Only use logs that have valid coordinates
  const geoLogs = logs.filter(
    (l) =>
      typeof l.latitude === "number" &&
      typeof l.longitude === "number" &&
      !isNaN(l.latitude) &&
      !isNaN(l.longitude)
  );

  if (geoLogs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        <span>📍 Không có dữ liệu tọa độ GPS cho lô này</span>
      </div>
    );
  }

  const positions = geoLogs.map((l) => [l.latitude, l.longitude]);
  const center = positions[0];

  return (
    <div className="overflow-hidden rounded-2xl border-4 border-white shadow-xl">
      <MapContainer
        key={center.toString()}
        center={center}
        zoom={12}
        style={{ height: "420px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Journey polyline */}
        <Polyline
          positions={positions}
          pathOptions={{ color: "#10b981", weight: 3, dashArray: "10, 8", opacity: 0.85 }}
        />

        {/* Markers */}
        {geoLogs.map((log, idx) => (
          <Marker key={log.id ?? idx} position={[log.latitude, log.longitude]} icon={createCustomIcon(log.action)}>
            <Popup>
              <div className="min-w-[180px]">
                <p
                  className="mb-1 text-base font-bold"
                  style={{ color: ACTION_COLORS[log.action] ?? "#334155" }}
                >
                  {log.action}
                </p>
                <p className="text-xs text-slate-600">📍 {log.location || "N/A"}</p>
                <p className="mt-0.5 text-xs text-slate-500">🕐 {formatTs(log.timestamp)}</p>
                {log.quantity != null && (
                  <p className="mt-0.5 text-xs text-slate-500">📦 SL: {log.quantity}</p>
                )}
                <div className="mt-2 border-t border-slate-100 pt-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      log.integrityStatus === "VERIFIED"
                        ? "bg-emerald-100 text-emerald-700"
                        : log.integrityStatus === "COMPROMISED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {log.integrityStatus || "UNKNOWN"}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
