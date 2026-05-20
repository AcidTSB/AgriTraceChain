import { useMemo } from "react";
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

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("vi-VN");
}

export function TraceJourneyMap({ logs = [] }) {
  const geoLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];

    return logs
      .map((l, idx) => {
        const rawLat = l?.latitude ?? l?.lat;
        const rawLng = l?.longitude ?? l?.lng;
        const lat = typeof rawLat === "string" ? Number(rawLat) : rawLat;
        const lng = typeof rawLng === "string" ? Number(rawLng) : rawLng;

        return {
          action: l?.action ?? `ACTION_${idx}`,
          lat,
          lng,
          date: l?.date,
        };
      })
      .filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
  }, [logs]);

  const positions = useMemo(() => geoLogs.map((l) => [l.lat, l.lng]), [geoLogs]);
  const center = positions[0];

  if (geoLogs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-400">
        <span>📍 Không có dữ liệu tọa độ GPS cho lô này</span>
      </div>
    );
  }

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
          <Marker key={`${log.action}-${log.date ?? "NA"}-${idx}`} position={[log.lat, log.lng]} icon={createCustomIcon(log.action)}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="mb-1 text-base font-bold" style={{ color: ACTION_COLORS[log.action] ?? "#334155" }}>
                  {log.action}
                </p>
                <p className="text-xs text-slate-600">🕐 {formatDate(log.date)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

