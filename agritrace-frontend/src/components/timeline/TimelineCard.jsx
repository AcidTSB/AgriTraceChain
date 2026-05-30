import { Badge } from "../ui/Badge";
import { SecurityBadge } from "../ui/SecurityBadge";
import { formatIntegrityLabel, formatTraceActionLabel } from "../../helpers/displayLabels";

function integrityVariant(status) {
  if (status === "VERIFIED") {
    return "success";
  }
  if (status === "COMPROMISED") {
    return "danger";
  }
  return "neutral";
}

function formatTimestamp(value) {
  if (!value) {
    return "Không rõ";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("vi-VN");
}

export function TimelineCard({
  log,
  mode = "internal",
  className = "",
  showMetadata = false,
}) {
  const isInspection = log?.action === "INSPECTION";
  const actionLabel = formatTraceActionLabel(log?.action);
  const integrityLabel = formatIntegrityLabel(log?.integrityStatus);

  return (
    <article
      className={`rounded-xl border p-4 ${
        isInspection
          ? "border-2 border-emerald-300 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white"
      } ${className}`.trim()}
      data-testid="timeline-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{actionLabel}</h3>
          {isInspection ? (
            <span className="inline-flex items-center rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              Cổng kiểm định
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Security badge — only shown when API provides signature/hash */}
          <SecurityBadge
            signature={log?.digitalSignature}
            hashValue={log?.hashValue}
          />
          <Badge variant={integrityVariant(log?.integrityStatus)} className="font-bold">
            {integrityLabel}
          </Badge>
        </div>
      </div>

      <div className={`mt-2 grid gap-2 text-sm text-slate-600 ${mode === "public" ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <p>
          <span className="font-medium text-slate-800">Thời gian:</span> {formatTimestamp(log?.timestamp)}
        </p>

        {mode === "internal" ? (
          <p>
            <span className="font-medium text-slate-800">Người thao tác:</span>{" "}
            {log?.actor || log?.actorName || log?.createdBy || "Không rõ"}
          </p>
        ) : null}

        <p>
          <span className="font-medium text-slate-800">Địa điểm:</span> {log?.location || "Không rõ"}
        </p>
        <p>
          <span className="font-medium text-slate-800">Số lượng:</span> {log?.quantity ?? "Không rõ"}
        </p>
      </div>

      {log?.notes ? <p className="mt-2 text-sm leading-6 text-slate-700">{log.notes}</p> : null}

      {showMetadata && log?.metadata ? (
        <details className="mt-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-700">Siêu dữ liệu</summary>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </details>
      ) : null}
    </article>
  );
}
