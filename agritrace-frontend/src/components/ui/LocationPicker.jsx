import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";

// Fix the default Leaflet marker icon broken by bundlers (Vite/Webpack)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).href,
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).href,
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).href,
});

function MapUpdater({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      map.flyTo({ lat, lng }, 15, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

function formatCoord(value, digits = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return n.toFixed(digits);
}

function getGeolocationErrorMessage(error) {
  const code = error?.code;
  if (code === 1) return "Bạn đã từ chối cấp quyền truy cập Vị trí.";
  if (code === 2) return "Thiết bị không xác định được vị trí (GPS yếu/không có tín hiệu).";
  if (code === 3) return "Hệ thống không kịp lấy vị trí. Vui lòng thử lại.";
  return error?.message ? String(error.message) : "Không thể lấy vị trí hiện tại.";
}

export function LocationPicker({ latitude, longitude, onLocationSelected, className = "" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePick = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!("geolocation" in navigator) || !navigator.geolocation?.getCurrentPosition) {
        setError("Trình duyệt không hỗ trợ Geolocation.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position?.coords?.latitude;
          const longitude = position?.coords?.longitude;

          const next = { latitude, longitude };
          onLocationSelected?.(next);
          setLoading(false);
        },
        (err) => {
          setError(getGeolocationErrorMessage(err));
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 5000,
        }
      );
    } catch (e) {
      setError(getGeolocationErrorMessage(e));
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/60 p-3 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">📍 Lấy vị trí hiện tại</p>
          <p className="mt-0.5 text-xs text-slate-600">Hệ thống sẽ yêu cầu quyền truy cập Vị trí trên thiết bị của bạn.</p>
        </div>

        <button
          type="button"
          onClick={handlePick}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
              Đang lấy...
            </>
          ) : (
            "Lấy vị trí"
          )}
        </button>
      </div>

      {error ? (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {typeof latitude === "number" && typeof longitude === "number" ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Tọa độ đã chọn</p>
          <p className="mt-1 text-sm text-slate-800">
            Latitude: <span className="font-bold">{formatCoord(latitude)}</span>
          </p>
          <p className="text-sm text-slate-800">
            Longitude: <span className="font-bold">{formatCoord(longitude)}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 italic">Bạn có thể kéo thả ghim trên bản đồ để điều chỉnh vị trí.</p>
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 shadow-sm relative z-0">
        <MapContainer
          center={
            typeof latitude === "number" && typeof longitude === "number"
              ? { lat: latitude, lng: longitude }
              : { lat: 10.762622, lng: 106.660172 } // Default to somewhere in VN
          }
          zoom={typeof latitude === "number" && typeof longitude === "number" ? 15 : 5}
          style={{ height: "350px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapUpdater 
            lat={typeof latitude === "number" ? latitude : null} 
            lng={typeof longitude === "number" ? longitude : null} 
          />
          {typeof latitude === "number" && typeof longitude === "number" && (
            <Marker
              draggable={true}
              position={{ lat: latitude, lng: longitude }}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  if (marker != null) {
                    const newPos = marker.getLatLng();
                    onLocationSelected?.({ latitude: newPos.lat, longitude: newPos.lng });
                  }
                }
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

