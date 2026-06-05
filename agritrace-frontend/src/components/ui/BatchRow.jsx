import { Link } from "react-router-dom";
import { Badge } from "./Badge";

/** Derives 2-char monogram from a string (e.g. "Batch BC-001" → "BC") */
function monogram(str = "") {
  const parts = str.trim().split(/[-\s]+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return str.slice(0, 2).toUpperCase();
}

/** Left accent bar color by batch status */
function accentColor(status = "") {
  const s = status.toUpperCase();
  if (s === "INSPECTED" || s === "APPROVED" || s === "COMPLETED") return "bg-primary";
  if (s === "PENDING_INSPECTION") return "bg-tertiary";
  if (s === "REJECTED" || s === "COMPROMISED") return "bg-error";
  return "bg-surface-variant";
}

/**
 * BatchRow — provenance-style list item for batches.
 *
 * Props:
 *  batchCode: string
 *  productName: string
 *  status: string
 *  updatedAt: string (ISO)
 *  detailTo: string — router path for "View Detail" link
 *  extra: ReactNode — optional extra slot (e.g. farm name)
 */
export function BatchRow({ batchCode, productName, status, updatedAt, detailTo, extra }) {
  const mono = monogram(batchCode ?? productName ?? "");
  const accent = accentColor(status);

  const timeLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-surface-container-lowest rounded-xl ghost-border grid grid-cols-[48px_minmax(0,1fr)_140px_110px_120px] items-center gap-4 hover:shadow-sm transition-shadow relative overflow-hidden group p-4 pl-5 max-md:grid-cols-[48px_1fr] max-md:items-start max-md:gap-y-3">
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent} group-hover:w-1.5 transition-all duration-200`} />

      {/* Monogram logo */}
      <div className="w-12 h-12 bg-surface-container-low rounded-lg flex items-center justify-center text-primary font-headline font-bold text-sm shrink-0">
        {mono}
      </div>

      {/* Info column */}
      <div className="min-w-0">
        <h4 className="font-headline font-bold text-on-surface text-sm truncate" title={batchCode}>{batchCode}</h4>
        <p className="text-xs text-on-surface-variant mt-0.5 truncate" title={productName}>{productName}</p>
        {extra && <p className="text-xs text-outline mt-0.5 truncate" title={extra}>{extra}</p>}
      </div>

      {/* Status column */}
      <div className="w-[140px] flex flex-col items-start max-md:col-span-2 max-md:w-full max-md:flex-row max-md:items-center max-md:justify-between max-md:border-t max-md:border-slate-100 max-md:pt-2">
        <p className="text-xs text-on-surface-variant mb-1 max-md:mb-0">Trạng thái</p>
        <Badge status={status} className="whitespace-nowrap w-fit inline-flex" />
      </div>

      {/* Date column */}
      <div className="w-[110px] flex flex-col items-start max-md:col-span-2 max-md:w-full max-md:flex-row max-md:items-center max-md:justify-between max-md:border-t max-md:border-slate-100 max-md:pt-2">
        <p className="text-xs text-on-surface-variant mb-1 max-md:mb-0">Cập nhật</p>
        <p className="text-sm font-medium text-on-surface">{timeLabel || "—"}</p>
      </div>

      {/* Action column */}
      <div className="w-[120px] flex justify-end max-md:col-span-2 max-md:w-full max-md:border-t max-md:border-slate-100 max-md:pt-2">
        {detailTo && (
          <Link
            to={detailTo}
            className="font-body text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
          >
            Xem chi tiết
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        )}
      </div>
    </div>
  );
}
