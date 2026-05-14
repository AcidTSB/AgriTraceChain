import { useState } from "react";

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

export function LocationPicker({ onLocationSelected, className = "" }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coords, setCoords] = useState(null);

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
          setCoords(next);
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

      {coords ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Tọa độ</p>
          <p className="mt-1 text-sm text-slate-800">
            Latitude: <span className="font-bold">{formatCoord(coords.latitude)}</span>
          </p>
          <p className="text-sm text-slate-800">
            Longitude: <span className="font-bold">{formatCoord(coords.longitude)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

