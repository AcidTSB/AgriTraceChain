import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { TemporalErrorBanner } from "../../components/ui/TemporalErrorBanner";
import { LocationPicker } from "../../components/ui/LocationPicker";
import { resolveBatchId } from "../../services/batchResolver";
import { traceService } from "../../services/traceService";

const actionOptions = [
  { value: "PLANTING", label: "Gieo hạt / Trồng cây" },
  { value: "FERTILIZING", label: "Bón phân" },
  { value: "WATERING", label: "Tưới nước" },
  { value: "SPRAYING", label: "Phun thuốc" },
  { value: "HARVESTING", label: "Thu hoạch" },
  { value: "PACKAGING", label: "Đóng gói" },
  { value: "SHIPPING", label: "Vận chuyển" },
];

const quantityRequiredActions = new Set(["HARVESTING", "PACKAGING", "SHIPPING"]);

export function getActionDisabledReason(optVal, logs = []) {
  const hasPlanting = logs.some((l) => l.action === "PLANTING");
  const hasHarvesting = logs.some((l) => l.action === "HARVESTING");
  const hasShipping = logs.some((l) => l.action === "SHIPPING");

  if (optVal === "PLANTING" && logs.length > 0) {
    return "Lô đã có nhật ký";
  }
  if (["FERTILIZING", "WATERING", "SPRAYING"].includes(optVal)) {
    if (!hasPlanting) return "Chưa gieo hạt / trồng cây";
    if (hasHarvesting) return "Lô đã thu hoạch";
    if (hasShipping) return "Lô đã vận chuyển";
  }
  if (optVal === "HARVESTING") {
    if (!hasPlanting) return "Chưa gieo hạt / trồng cây";
    if (hasShipping) return "Lô đã vận chuyển";
  }
  if (optVal === "PACKAGING") {
    if (!hasHarvesting) return "Chưa thu hoạch";
    if (hasShipping) return "Lô đã vận chuyển";
  }
  if (optVal === "SHIPPING") {
    if (!hasHarvesting) return "Chưa thu hoạch";
  }
  return "";
}

function detectTemporalViolations(selectedAction, existingLogs = []) {
  const violations = [];
  const reason = getActionDisabledReason(selectedAction, existingLogs);
  if (reason) {
    violations.push(reason);
  }
  return violations;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function FieldGroup({ label, hint, children, required }) {
  return (
    <div className="space-y-2">
      <label className="block font-label text-sm font-medium text-on-surface">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
    </div>
  );
}

export function FarmerAddTraceLogPage() {
  const navigate = useNavigate();
  const { batchCode } = useParams();
  const { success, error: showError } = useToast();

  const [batchId, setBatchId] = useState("");
  const [existingLogs, setExistingLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ location: "", quantity: "", gps: "" });

  const [form, setForm] = useState({
    action: "PLANTING",
    location: "",
    notes: "",
    quantity: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    let active = true;
    const loadBatchData = async () => {
      setLoading(true);
      setError("");
      try {
        const resolved = await resolveBatchId(batchCode);
        if (!active) return;
        setBatchId(resolved);
        const logs = await traceService.getTraceLogsByBatchId(resolved);
        if (active) setExistingLogs(Array.isArray(logs) ? logs : []);
      } catch (err) {
        if (active) setError(err?.userMessage ?? "Cannot resolve batch code.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadBatchData();
    return () => { active = false; };
  }, [batchCode]);

  useEffect(() => {
    if (existingLogs && existingLogs.length > 0) {
      const firstEnabledOpt = actionOptions.find(
        (opt) => !getActionDisabledReason(opt.value, existingLogs)
      );
      if (firstEnabledOpt) {
        setForm((prev) => ({ ...prev, action: firstEnabledOpt.value }));
      }
    } else {
      setForm((prev) => ({ ...prev, action: "PLANTING" }));
    }
  }, [existingLogs]);

  const quantityRequired = useMemo(() => quantityRequiredActions.has(form.action), [form.action]);
  const hasGpsCoords = useMemo(
    () => typeof form.latitude === "number" && typeof form.longitude === "number",
    [form.latitude, form.longitude],
  );
  const temporalViolations = useMemo(
    () => detectTemporalViolations(form.action, existingLogs),
    [form.action, existingLogs],
  );
  const hasTemporalViolation = temporalViolations.length > 0;
  const canSubmit = useMemo(() => {
    if (hasTemporalViolation) return false;
    if (!hasGpsCoords) return false;
    if (!form.action || !form.location.trim()) return false;
    if (quantityRequired && Number(form.quantity) <= 0) return false;
    return true;
  }, [form, quantityRequired, hasTemporalViolation, hasGpsCoords]);

  const reverseGeocode = async (latitude, longitude) => {
    const query = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "jsonv2",
      "accept-language": "vi",
      zoom: "16",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      throw new Error("Không thể dịch tọa độ sang địa chỉ.");
    }
    const payload = await response.json();
    if (typeof payload?.display_name === "string" && payload.display_name.trim()) {
      return payload.display_name.trim();
    }
    throw new Error("Không tìm thấy địa chỉ phù hợp cho tọa độ này.");
  };

  const handleSearchLocation = async () => {
    if (!form.location.trim()) return;
    
    setIsSearchingLocation(true);
    try {
      const q = encodeURIComponent(form.location.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setForm(prev => ({ ...prev, latitude: lat, longitude: lon }));
        success("Đã tìm thấy toạ độ từ địa chỉ.");
        if (fieldErrors.gps) {
          setFieldErrors(prev => ({ ...prev, gps: "" }));
        }
      } else {
        showError("Không tìm thấy toạ độ cho địa chỉ này.");
      }
    } catch (err) {
      showError("Lỗi khi tìm kiếm địa chỉ.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const onLocationSelected = async ({ latitude, longitude }) => {
    setFieldErrors((prev) => ({ ...prev, gps: "" }));
    setResolvingLocation(true);
    try {
      const resolvedLocation = await reverseGeocode(latitude, longitude);
      setForm((prev) => ({ ...prev, latitude, longitude, location: resolvedLocation }));
      setFieldErrors((prev) => ({ ...prev, location: "" }));
    } catch {
      const fallbackLocation = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setForm((prev) => ({ ...prev, latitude, longitude, location: fallbackLocation }));
      showError("Không thể dịch địa chỉ tự động. Hệ thống sẽ dùng tọa độ GPS làm bằng chứng vị trí.");
    } finally {
      setResolvingLocation(false);
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (hasTemporalViolation) return;
    const nextFieldErrors = { location: "", quantity: "", gps: "" };
    let valid = true;
    if (!hasGpsCoords) { nextFieldErrors.gps = "Bạn cần bấm 'Lấy vị trí' trước khi ghi nhật ký."; valid = false; }
    if (!form.location.trim()) { nextFieldErrors.location = "Vị trí là bắt buộc."; valid = false; }
    if (quantityRequired && Number(form.quantity) <= 0) { nextFieldErrors.quantity = "Số lượng phải lớn hơn 0."; valid = false; }
    setFieldErrors(nextFieldErrors);
    if (!valid || !canSubmit || !batchId) return;
    setShowConfirm(true);
  };

  const submitConfirmed = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    setError("");
    try {
      const payload = { batchId, action: form.action, location: form.location, notes: form.notes };
      if (form.quantity && Number(form.quantity) > 0) payload.quantity = Number(form.quantity);
      if (typeof form.latitude === "number" && !Number.isNaN(form.latitude)) payload.latitude = form.latitude;
      if (typeof form.longitude === "number" && !Number.isNaN(form.longitude)) payload.longitude = form.longitude;
      await traceService.createTraceLog(payload);
      success("Nhật ký đã được ghi thành công.");
      navigate(`/farmer/batches/${encodeURIComponent(batchCode)}`, { replace: true });
    } catch (err) {
      const message = err?.userMessage ?? "Không thể ghi nhật ký.";
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-12">
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error && !batchId) {
    return (
      <div className="max-w-2xl mx-auto bg-error-container/20 border-l-4 border-error rounded-r-xl p-6">
        <h2 className="font-headline font-bold text-on-error-container">Không thể mở form</h2>
        <p className="text-sm text-on-error-container/80 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Context Header — centered, template spec */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-label font-medium mb-4 ghost-border tracking-wide uppercase">
          <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
          Batch #{batchCode}
        </span>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface mb-2">
          Ghi nhật ký
        </h1>
        <p className="text-on-surface-variant text-base">
          Ghi lại sự kiện mới đã xảy ra trong quá trình canh tác lô hàng này.
        </p>
      </div>

      {/* Temporal Violation Banner */}
      <TemporalErrorBanner violations={temporalViolations} />

      {/* Form Card — with primary accent bar on left */}
      <div className="bg-surface-container-lowest rounded-xl p-8 ambient-shadow relative overflow-hidden ghost-border">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-xl" />

        <form className="space-y-8" onSubmit={onSubmit}>
          {/* Action */}
          <FieldGroup label="Hành động" hint="Chọn hoạt động canh tác diễn ra trong bước này." required>
            <div className="relative rounded-lg bg-surface-container-lowest ghost-border transition-all duration-200">
              <select
                id="action"
                value={form.action}
                onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value }))}
                className="block w-full rounded-lg border-0 bg-transparent py-3 pl-4 pr-10 text-on-surface focus:ring-0 text-sm cursor-pointer appearance-none"
              >
                {actionOptions.map((opt) => {
                  const reason = getActionDisabledReason(opt.value, existingLogs);
                  const isDisabled = !!reason;
                  return (
                    <option key={opt.value} value={opt.value} disabled={isDisabled}>
                      {opt.label} {reason ? `(${reason})` : ""}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
              </div>
            </div>
          </FieldGroup>

          {/* Location */}
          <FieldGroup label="Vị trí" required hint="Khu vực nông trại, lô canh tác cụ thể.">
            <div className="relative rounded-lg bg-surface-container-lowest ghost-border transition-all duration-200">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px] pointer-events-none">pin_drop</span>
              <input
                id="location"
                type="text"
                placeholder="Bấm 'Lấy vị trí' hoặc nhập địa chỉ và tìm kiếm"
                value={form.location}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, location: e.target.value }));
                  if (fieldErrors.location) setFieldErrors((p) => ({ ...p, location: "" }));
                }}
                className="block w-full rounded-lg border-0 bg-transparent py-3 pl-10 pr-28 text-on-surface placeholder:text-outline focus:ring-0 text-sm"
                required
              />
              <div className="absolute inset-y-1 right-1 flex items-center">
                 <button
                   type="button"
                   onClick={handleSearchLocation}
                   disabled={isSearchingLocation || !form.location.trim()}
                   className="h-full px-3 rounded bg-primary text-on-primary text-xs font-bold shadow-sm hover:opacity-90 disabled:opacity-60 flex items-center justify-center"
                 >
                   {isSearchingLocation ? "Đang tìm..." : "Tìm toạ độ"}
                 </button>
              </div>
            </div>
            {hasGpsCoords ? (
              <p className="text-xs text-emerald-700 mt-1">Địa điểm đã khóa theo tọa độ GPS để đảm bảo tính toàn vẹn dữ liệu.</p>
            ) : null}
            {fieldErrors.location && <p className="text-xs text-error mt-1">{fieldErrors.location}</p>}
          </FieldGroup>

          <LocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            onLocationSelected={onLocationSelected}
          />

          {resolvingLocation ? (
            <p className="text-xs text-on-surface-variant">Đang xác thực tọa độ và dịch sang địa chỉ...</p>
          ) : null}
          {fieldErrors.gps && <p className="text-xs text-error">{fieldErrors.gps}</p>}

          {typeof form.latitude === "number" && typeof form.longitude === "number" ? (
            <p className="text-xs text-on-surface-variant">
              Tọa độ sẽ được gửi kèm nhật ký: {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
            </p>
          ) : null}

          {/* Quantity */}
          <FieldGroup
            label={quantityRequired ? "Số lượng" : "Số lượng (tùy chọn)"}
            required={quantityRequired}
          >
            <div className="relative rounded-lg bg-surface-container-lowest ghost-border transition-all duration-200">
              <input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                placeholder="VD: 500"
                value={form.quantity}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, quantity: e.target.value }));
                  if (fieldErrors.quantity) setFieldErrors((p) => ({ ...p, quantity: "" }));
                }}
                className="block w-full rounded-lg border-0 bg-transparent py-3 pl-4 pr-16 text-on-surface placeholder:text-outline focus:ring-0 text-sm"
                required={quantityRequired}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <span className="text-outline text-sm font-medium">theo đơn vị lô</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-outline">Số lượng được hiểu theo đơn vị đã khai báo cho lô hàng.</p>
            {fieldErrors.quantity && <p className="text-xs text-error mt-1">{fieldErrors.quantity}</p>}
          </FieldGroup>

          {/* Notes */}
          <FieldGroup label="Ghi chú">
            <div className="rounded-lg bg-surface-container-lowest ghost-border transition-all duration-200 overflow-hidden">
              <textarea
                id="notes"
                rows={4}
                placeholder="Mô tả điều kiện thời tiết, vật tư đã dùng, hoặc quan sát cụ thể..."
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="block w-full resize-none border-0 bg-transparent py-3 px-4 text-on-surface placeholder:text-outline focus:ring-0 text-sm"
              />
            </div>
          </FieldGroup>

          {error && <p className="text-sm text-error">{error}</p>}

          {/* Actions */}
          <div className="pt-6 border-t border-surface-container-highest flex gap-4 justify-end">
            <Link to={`/farmer/batches/${encodeURIComponent(batchCode)}`}>
              <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors">
                Hủy
              </button>
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              title={hasTemporalViolation ? "Bị chặn do vi phạm logic thời gian" : undefined}
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-on-primary shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2 btn-primary-gradient disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              {submitting ? "Đang ghi..." : "Ghi nhật ký"}
            </button>
          </div>
        </form>
      </div>

      {/* Info Hint card — template spec */}
      <div className="bg-surface-container-low rounded-xl p-6 flex gap-4 items-start">
        <span className="material-symbols-outlined text-primary mt-1">info</span>
        <div>
          <h4 className="font-headline text-sm font-bold text-on-surface mb-1">Tại sao cần ghi nhật ký?</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Mỗi sự kiện ghi vào Batch #{batchCode} trực tiếp đóng góp vào Provenance Score của lô hàng.
            Các hành động được xác minh xây dựng niềm tin với người tiêu dùng và tuân thủ tiêu chuẩn
            truy xuất nguồn gốc toàn cầu.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Xác nhận ghi nhật ký"
        message="Ghi sự kiện này vào timeline bất biến của blockchain?"
        confirmText="Xác nhận ghi"
        onCancel={() => setShowConfirm(false)}
        onConfirm={submitConfirmed}
      />
    </div>
  );
}
