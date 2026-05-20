import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { useToast } from "../../hooks/useToast";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { MapTracking } from "../../components/map/MapTracking";
import { VerifyIntegrityModal } from "../../components/ui/VerifyIntegrityModal";
import { batchService } from "../../services/batchService";
import { inspectorQueueService } from "../../services/inspectorQueueService";
import { realtimeNotificationService } from "../../services/realtimeNotificationService";
import { traceService } from "../../services/traceService";

/** Export logs to CSV format */
function exportToCSV(batch, logs) {
  const headers = ["Thời gian", "Hành động", "Người thao tác", "Địa điểm", "Số lượng", "Ghi chú"];
  const rows = logs.map((log) => [
    new Date(log.createdAt).toLocaleString("vi-VN"),
    log.action,
    log.createdBy || "Không rõ",
    log.location || "-",
    log.quantity || "-",
    log.notes || "-",
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${batch?.batchCode}_export.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Export logs to PDF format (simple HTML table) */
function exportToPDF(batch, logs) {
  const timestamp = new Date().toLocaleString("vi-VN");
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Báo cáo kiểm định - ${batch?.batchCode}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #006c49; border-bottom: 2px solid #006c49; padding-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-item { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        .info-label { font-weight: bold; color: #666; font-size: 0.9em; }
        .info-value { font-size: 1.1em; color: #111; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #006c49; color: white; padding: 10px; text-align: left; font-weight: bold; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 40px; font-size: 0.85em; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>Báo cáo kiểm định: ${batch?.batchCode}</h1>
      
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Sản phẩm</div>
          <div class="info-value">${batch?.productName || "-"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Nông trại</div>
          <div class="info-value">${batch?.farmName || "-"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Số lượng</div>
          <div class="info-value">${batch?.quantity || "-"}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Ngày thu hoạch</div>
          <div class="info-value">${batch?.harvestDate || "-"}</div>
        </div>
      </div>

      <h2>Dòng thời gian truy xuất</h2>
      <table>
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Hành động</th>
            <th>Người thao tác</th>
            <th>Địa điểm</th>
            <th>Số lượng</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map((log) => `
            <tr>
              <td>${new Date(log.createdAt).toLocaleString("vi-VN")}</td>
              <td><strong>${log.action}</strong></td>
              <td>${log.createdBy || "-"}</td>
              <td>${log.location || "-"}</td>
              <td>${log.quantity || "-"}</td>
              <td>${log.notes || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div class="footer">
        <p>Tạo lúc: ${timestamp}</p>
        <p>Hệ thống kiểm định AgriTrace</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
    link.setAttribute("download", `${batch?.batchCode}_bao_cao_kiem_dinh.html`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function hasInspection(logs) {
  return logs.some((item) => item.action === "INSPECTION");
}

export function InspectorBatchDetailPage() {
  const { batchCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();

  const [batch, setBatch] = useState(null);
  const [batchId, setBatchId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ location: "" });
  const [form, setForm] = useState({
    location: "Inspection Center",
    notes: "Đã hoàn tất kiểm tra chất lượng.",
  });

  useEffect(() => {
    if (location.state?.toast) {
      success(location.state.toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, success]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      if (!inspectorQueueService.isSupportedCode(batchCode)) {
        setError("Mã lô không hợp lệ. Vui lòng mở lô có định dạng BATCH-...");
        setLoading(false);
        return;
      }

      try {
        const batchInfo = await batchService.getBatchByCode(batchCode);
        const resolvedId = batchInfo?.id;
        if (!resolvedId) {
          throw new Error("Cannot resolve batchId from batchCode.");
        }

        const traceLogs = await traceService.getTraceLogsByBatchId(resolvedId);

        if (!active) {
          return;
        }

        setBatch(batchInfo);
        setBatchId(resolvedId);
        setLogs(traceLogs);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.userMessage ?? "Không thể tải chi tiết kiểm định.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [batchCode]);

  const inspected = useMemo(() => hasInspection(logs), [logs]);

  const requestSubmit = (event) => {
    event.preventDefault();

    const nextErrors = { location: "" };
    if (!form.location.trim()) {
      nextErrors.location = "Địa điểm kiểm định là bắt buộc.";
      setFieldErrors(nextErrors);
      return;
    }

    setConfirmOpen(true);
  };

  const submitInspection = async () => {
    setConfirmOpen(false);
    setSubmitting(true);
    setError("");

    const previousQueueCodes = inspectorQueueService.getCodes();
    inspectorQueueService.removeCode(batchCode);

    try {
      await traceService.createTraceLog({
        batchId,
        action: "INSPECTION",
        location: form.location.trim(),
        notes: form.notes.trim(),
      });

      realtimeNotificationService.push({
        kind: "INSPECTION_RESULT",
        tone: "success",
        title: "Đã gửi kiểm định",
        message: `Lô ${batchCode} đã được kiểm định tại ${form.location.trim()}.`,
        route: "/inspector/review",
        batchCode,
        actorRole: "INSPECTOR",
      });

      navigate("/inspector/review", {
        replace: true,
        state: {
          toast: "Gửi kiểm định thành công.",
          refresh: true,
          removedCode: batchCode,
        },
      });
    } catch (err) {
      inspectorQueueService.replaceAll(previousQueueCodes);
      const message = err?.userMessage ?? "Gửi kiểm định thất bại.";
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <StateCard title="Không thể mở chi tiết kiểm định" message={error} tone="error" className="max-w-3xl" />
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Đánh giá kiểm định</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Lô {batch?.batchCode}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sản phẩm: <span className="font-medium">{batch?.productName ?? "Chưa cập nhật"}</span>
            {batch?.productType && <span className="text-slate-400"> · {batch.productType}</span>}
            {" | "}
            Nông trại: <span className="font-medium">{batch?.farmName ?? "Chưa cập nhật"}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">scale</span>
              {batch?.quantity ?? "?"}{batch?.unit ? ` ${batch.unit}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              Thu hoạch: {batch?.harvestDate
                ? new Date(batch.harvestDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "Chưa cập nhật"}
            </span>
            {batch?.isCompromised && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                <span className="material-symbols-outlined text-[12px]">warning</span>
                Tính toàn vẹn bị vi phạm
              </span>
            )}
          </div>
        </div>

        <Link to="/inspector/review">
          <Button variant="secondary">Quay lại hàng đợi</Button>
        </Link>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Dòng thời gian</h2>
          <div className="flex flex-wrap gap-2">
            {logs.length > 0 && (
              <>
                <Button variant="secondary" onClick={() => setAuditOpen(true)}>
                  🔍 Kiểm toán bảo mật
                </Button>
                <Button variant="secondary" onClick={() => exportToCSV(batch, logs)}>
                  📥 Xuất CSV
                </Button>
                <Button variant="secondary" onClick={() => exportToPDF(batch, logs)}>
                  📄 Xuất báo cáo
                </Button>
              </>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">Không tìm thấy bản ghi truy xuất cho lô này.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => <TimelineCard key={log.id} log={log} mode="internal" />)}
          </div>
        )}
      </Card>

      {/* Map Tracking */}
      {logs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">🗺️ Hành trình lô hàng</h2>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
              {logs.filter(l => l.latitude && l.longitude).length} điểm GPS
            </span>
          </div>
          <MapTracking logs={logs} />
        </div>
      )}

      {inspected ? (
        <Card>
          <h2 className="text-lg font-semibold text-emerald-800">Đã gửi kiểm định</h2>
          <p className="mt-2 text-sm text-slate-600">
            Lô này đã có bản ghi INSPECTION. Vui lòng kiểm tra lại trạng thái hàng đợi.
          </p>
          <div className="mt-4">
            <Link to={`/trace/${encodeURIComponent(batchCode)}`} target="_blank" rel="noreferrer">
              <Button variant="secondary">Mở kết quả truy xuất công khai</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Gửi kiểm định</h2>
          <form className="mt-4 space-y-4" onSubmit={requestSubmit}>
            <Input
              id="inspection-location"
              label="Địa điểm kiểm định"
              value={form.location}
              error={fieldErrors.location}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, location: event.target.value }));
                if (fieldErrors.location) {
                  setFieldErrors((prev) => ({ ...prev, location: "" }));
                }
              }}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="inspection-notes">
                Ghi chú
              </label>
              <textarea
                id="inspection-notes"
                rows={4}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors duration-200 ease-in-out placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Đang gửi..." : "Gửi kiểm định"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận gửi kiểm định"
        message="Hành động này sẽ thêm bản ghi INSPECTION vào timeline. Tiếp tục?"
        confirmText="Gửi"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={submitInspection}
      />

      {/* Security Audit Modal */}
      <VerifyIntegrityModal
        open={auditOpen}
        logs={logs}
        onClose={() => setAuditOpen(false)}
      />
    </div>
  );
}
