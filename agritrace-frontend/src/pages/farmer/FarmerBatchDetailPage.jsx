import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { MapTracking } from "../../components/map/MapTracking";
import { VerifyIntegrityModal } from "../../components/ui/VerifyIntegrityModal";
import { resolveBatchId } from "../../services/batchResolver";
import { batchService } from "../../services/batchService";
import { productService } from "../../services/productService";
import { traceService } from "../../services/traceService";
import { formatIntegrityLabel, formatTraceActionLabel, formatUnitLabel } from "../../helpers/displayLabels";

/** Export logs to CSV format */
function exportToCSV(batch, logs) {
  const headers = ["Thời gian", "Hành động", "Người thao tác", "Địa điểm", "Số lượng", "Ghi chú"];
  const rows = logs.map((log) => [
    new Date(log.createdAt).toLocaleString("vi-VN"),
    formatTraceActionLabel(log.action),
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
      <title>Báo cáo lô hàng - ${batch?.batchCode}</title>
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
      <h1>Báo cáo truy xuất lô: ${batch?.batchCode}</h1>
      
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
              <td><strong>${formatTraceActionLabel(log.action)}</strong></td>
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
        <p>Hệ thống sổ cái AgriTrace</p>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
    link.setAttribute("download", `${batch?.batchCode}_bao_cao_lo_hang.html`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Summary meta item row */
function MetaRow({ icon, label, value, highlight = false }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary ghost-border shrink-0">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-base font-semibold ${highlight ? "text-primary-container" : "text-on-surface"}`}>{value || "Không rõ"}</p>
      </div>
    </div>
  );
}

export function FarmerBatchDetailPage() {
  const { batchCode } = useParams();
  const [batch, setBatch] = useState(null);
  const [product, setProduct] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const [batchDetail, batchId] = await Promise.all([
          batchService.getBatchByCode(batchCode),
          resolveBatchId(batchCode),
        ]);
        const productDetail = batchDetail?.productId ? await productService.getProductById(batchDetail.productId) : null;
        const traceLogs = await traceService.getTraceLogsByBatchId(batchId);
        if (!active) return;
        setBatch(batchDetail);
        setProduct(productDetail);
        setLogs(traceLogs);
      } catch (err) {
        if (!active) return;
        setError(err?.userMessage ?? "Không thể tải chi tiết lô hàng.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, [batchCode]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="lg:col-span-8">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container/20 border-l-4 border-error rounded-r-xl p-6 max-w-2xl">
        <h2 className="font-headline font-bold text-on-error-container">Lỗi tải dữ liệu</h2>
        <p className="text-sm text-on-error-container/80 mt-1">{error}</p>
      </div>
    );
  }

  const createdLabel = batch?.createdAt
    ? new Date(batch.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Không rõ";

  const tracePaused = product?.isActive === false;

  const recentActivity = logs.slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: "Lô hàng", to: "/farmer/batches" },
          { label: batch?.batchCode ?? batchCode },
        ]}
        title={batch?.batchCode ?? batchCode}
        subtitle={`${batch?.productName ?? ""} · ${batch?.farmName ?? ""}`}
        rightSlot={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            {logs.length > 0 && (
              <button
                onClick={() => setAuditOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-2 py-2.5 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-dim sm:w-auto sm:px-5"
              >
                <span className="material-symbols-outlined text-[18px]">shield_lock</span>
                <span className="truncate">Kiểm toán</span>
              </button>
            )}
            <Link to={`/farmer/batches/${encodeURIComponent(batchCode)}/qr-share`} className="w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-2 py-2.5 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-dim sm:w-auto sm:px-5">
                <span className="material-symbols-outlined text-[18px]">qr_code</span>
                <span className="truncate">Chia sẻ QR</span>
              </button>
            </Link>
            
            {logs.length > 0 && (
              <>
                <button
                  onClick={() => exportToCSV(batch, logs)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-2 py-2.5 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-dim sm:w-auto sm:px-5"
                >
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  <span className="truncate">Xuất CSV</span>
                </button>
                <button
                  onClick={() => exportToPDF(batch, logs)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-high px-2 py-2.5 font-label text-sm font-semibold text-on-surface transition-colors hover:bg-surface-dim sm:w-auto sm:px-5"
                >
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  <span className="truncate">Xuất báo cáo</span>
                </button>
              </>
            )}
            
            {/* Nút Primary: Chiếm 2 cột trên mobile, nằm ngang trên desktop */}
            <Link to={`/farmer/batches/${encodeURIComponent(batchCode)}/trace/new`} className="col-span-2 w-full sm:w-auto">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl shadow-md btn-primary-gradient px-4 py-2.5 font-label text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto sm:px-5">
                <span className="material-symbols-outlined text-[18px]">add_notes</span>
                Thêm nhật ký
              </button>
            </Link>
          </div>
        }
      />

      {tracePaused ? (
        <StateCard
          tone="warning"
          title="Truy xuất tạm ngừng"
          message="Truy xuất nguồn gốc của lô hàng này đang tạm ngừng bởi quản trị viên. Dữ liệu nội bộ vẫn được giữ để đối chiếu." 
        />
      ) : null}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col: Summary - Đã sửa lỗi overlap ở đây bằng lg:sticky lg:top-28 */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-28">
          {/* Dark Summary Card — Living Ledger template */}
          <div className="bg-slate-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-white">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-l-2xl" />
            <h2 className="font-headline text-xl font-bold mb-8 tracking-tight flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-emerald-400">inventory</span>
              Thông tin lô
            </h2>
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                  <span className="material-symbols-outlined">eco</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sản phẩm</p>
                  <p className="font-headline text-lg font-bold text-white">{batch?.productName ?? "Chưa cập nhật"}</p>
                  {batch?.productType && (
                    <p className="text-xs text-emerald-400 mt-0.5">{batch.productType}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                  <span className="material-symbols-outlined">agriculture</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Nông trại</p>
                  <p className="font-headline text-lg font-bold text-white">{batch?.farmName ?? "Chưa cập nhật"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                  <span className="material-symbols-outlined">scale</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Số lượng</p>
                  <p className="font-headline text-lg font-bold text-emerald-300">
                    {batch?.quantity ?? "Chưa cập nhật"}
                    {batch?.unit && <span className="text-sm font-normal text-slate-400 ml-1">{formatUnitLabel(batch.unit)}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0 border border-slate-700">
                  <span className="material-symbols-outlined">calendar_month</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ngày thu hoạch</p>
                  <p className="font-headline text-base font-semibold text-white">
                    {batch?.harvestDate
                      ? new Date(batch.harvestDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "Chưa cập nhật"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Meta Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 ghost-border ambient-shadow">
            <h3 className="text-xs font-headline font-bold text-outline uppercase tracking-widest mb-5">Thông tin bổ sung</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-surface-dim pb-3">
                <span className="text-sm text-on-surface-variant">Trạng thái</span>
                <Badge status={batch?.status} />
              </div>
              <div className="flex justify-between items-center border-b border-surface-dim pb-3">
                <span className="text-sm text-on-surface-variant">Ngày tạo</span>
                <span className="text-sm font-semibold text-on-surface">{createdLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-on-surface-variant">Nhật ký</span>
                <span className="text-sm font-bold text-primary">{logs.length} sự kiện</span>
              </div>
            </div>
          </div>

          {recentActivity.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl p-6 ghost-border ambient-shadow">
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="text-xs font-headline font-bold text-outline uppercase tracking-widest">Hoạt động gần đây</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/30 px-2 py-0.5 text-[11px] font-semibold text-on-secondary-container">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Luồng trực tiếp
                </span>
              </div>
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 rounded-xl bg-surface-container/40 px-3 py-3 transition-all hover:bg-surface-container">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[18px]">timeline</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-on-surface">{formatTraceActionLabel(log.action)}</p>
                        <span className="text-[11px] text-on-surface-variant">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Không rõ"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">{log.location || "Không rõ"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${log.integrityStatus === "VERIFIED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {formatIntegrityLabel(log.integrityStatus)}
                        </span>
                        {log.quantity != null && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            SL {log.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map Card */}
          {logs.filter((l) => l.latitude && l.longitude).length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden ghost-border ambient-shadow">
              <div className="px-5 py-4 flex items-center justify-between border-b border-surface-container-high/30">
                <h3 className="font-headline text-sm font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">map</span>
                  Hành trình lô hàng
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary-container/30 text-on-secondary-container text-xs font-medium">
                  {logs.filter((l) => l.latitude && l.longitude).length} điểm GPS
                </span>
              </div>
              <MapTracking logs={logs} />
            </div>
          )}
        </div>

        {/* Right Col: Journey Log */}
        <div className="lg:col-span-8">
          <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border ambient-shadow min-h-full">
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-8 tracking-tight flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">view_timeline</span>
              Nhật ký hành trình
            </h2>

            {logs.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-outline">timeline</span>
                </div>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-2">Chưa có nhật ký</h3>
                <p className="text-sm text-on-surface-variant mb-6">Thêm sự kiện đầu tiên để bắt đầu hành trình lô hàng.</p>
                <Link to={`/farmer/batches/${encodeURIComponent(batchCode)}/trace/new`}>
                  <button className="btn-primary-gradient text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 transition-opacity">
                    Thêm nhật ký đầu tiên
                  </button>
                </Link>
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-dashed border-outline-variant/30 space-y-10">
                {logs.map((log) => (
                  <div key={log.id} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-primary-fixed-dim ring-4 ring-surface-container-lowest z-10" />
                    <div className="ml-4">
                      <TimelineCard log={log} mode="internal" showMetadata />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Audit Modal */}
      <VerifyIntegrityModal open={auditOpen} logs={logs} onClose={() => setAuditOpen(false)} />
    </div>
  );
}