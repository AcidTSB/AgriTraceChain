import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { traceService } from "../../services/traceService";
import { formatRoleLabel, getAuditActionLabel } from "../../helpers/displayLabels";

// ─── Styles ───────────────────────────────────────────────────────────────────
const ACTION_STYLES = {
  CREATE: "bg-secondary-container text-on-secondary-container",
  UPDATE: "bg-orange-100 text-orange-800",
  DELETE: "bg-error-container text-on-error-container",
  VERIFY: "bg-surface-container-high text-primary",
  REJECT: "bg-tertiary-container/30 text-on-tertiary-container",
  READ_COMPROMISED: "bg-slate-100 text-slate-600 font-medium",
  READ_OK: "bg-secondary-container/50 text-on-secondary-container",
  INSPECTION: "bg-surface-container-high text-primary",
  SUSPEND: "bg-error-container text-on-error-container",
  RESUME: "bg-secondary-container text-on-secondary-container",
  COMPROMISE_DETECTED: "bg-error text-white font-bold animate-pulse px-2 py-0.5 rounded shadow-sm",
};

const STATUS_DOT = {
  SUCCESS: "bg-primary",
  BLOCKED: "bg-orange-500",
  ALERT: "bg-amber-500",
  FAILED: "bg-error",
  INFO: "bg-slate-400",
};

const STATUS_TEXT = {
  SUCCESS: "text-primary",
  BLOCKED: "text-orange-600",
  ALERT: "text-amber-600",
  FAILED: "text-error",
  INFO: "text-slate-500",
};

const ROLE_STYLES = {
  FARMER: "bg-secondary-container/50 text-on-secondary-container",
  INSPECTOR: "bg-surface-container-highest text-on-surface",
  ADMIN: "bg-surface-container-high text-on-surface",
  SYSTEM: "bg-surface-variant/30 text-on-surface-variant",
};

const STATUS_LABELS = {
  SUCCESS: "THÀNH CÔNG",
  BLOCKED: "BỊ CHẶN",
  ALERT: "CẢNH BÁO",
  FAILED: "THẤT BẠI",
  INFO: "THÔNG TIN",
};

function formatTs(iso) {
  if (!iso) return "Không rõ";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("vi-VN", { hour12: false });
}

function resolveStatus(item) {
  const op = (item.operation ?? "").toUpperCase();
  const text = `${item.operation ?? ""} ${item.notes ?? ""}`.toUpperCase();
  if (text.includes("FAILED")) return "FAILED";
  if (op === "REJECT" || text.includes("REJECT")) return "BLOCKED";
  if (op === "COMPROMISE_DETECTED" || op === "SUSPEND" || text.includes("ALERT") || (text.includes("COMPROMISED") && op !== "READ_COMPROMISED")) return "ALERT";
  if (op === "READ_COMPROMISED") return "INFO";
  return "SUCCESS";
}

function toLedgerItem(item) {
  const shortActor = item.actorId ? String(item.actorId).slice(0, 8) : "system";
  return {
    id: item.id,
    timestamp: item.createdAt,
    user: shortActor,
    role: (item.actorRole || "SYSTEM").toUpperCase(),
    action: (item.operation || "VERIFY").toUpperCase(),
    target: item.batchCode
      ? `Lô / ${item.batchCode}`
      : `Nhật ký / ${item.traceLogId ?? "N/A"}`,
    detail: item.notes || "Không có mô tả",
    ipAddress: item.actorRegion || "-",
    status: resolveStatus(item),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminAuditLedgerPage() {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL or ALERT
  const [entries, setEntries] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    successCount: 0,
    warningOrBlockedCount: 0,
    failedCount: 0,
  });

  const ALL_ACTIONS = useMemo(
    () => ["ALL", ...new Set(entries.map((e) => e.action))],
    [entries]
  );

  const fetchCursorPage = async (cursorValue = null) => {
    setLoading(true);
    setError("");
    try {
      const payload = await traceService.getAuditLogsCursor({
        cursor: cursorValue,
        limit: 20,
      });
      const rawData = Array.isArray(payload?.data) ? payload.data : [];
      const mapped = rawData.map(toLedgerItem);
      setEntries((prev) => (cursorValue == null ? mapped : [...prev, ...mapped]));
      setNextCursor(payload?.nextCursor ?? null);
    } catch (e) {
      setError(e?.message || "Không thể tải nhật ký kiểm toán.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await traceService.getAuditLogStats();
      if (statsData) {
        setStats(statsData);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  useEffect(() => {
    fetchCursorPage(null);
    fetchStats();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const result = await traceService.scanIntegrity();
      alert(
        `Quét toàn vẹn dữ liệu hoàn tất!\n\n` +
        `- Tổng số lô đã quét: ${result.scannedBatches}\n` +
        `- Số lô phát hiện vi phạm: ${result.compromisedDetected}\n` +
        `- Số lô mới bị đánh dấu vi phạm: ${result.newlyMarkedCompromised}\n` +
        `- Số lô đã vi phạm từ trước: ${result.alreadyCompromised}\n` +
        `- Thời gian thực hiện: ${result.durationMs} ms`
      );
      await fetchStats();
      await fetchCursorPage(null);
    } catch (err) {
      alert("Quét toàn vẹn thất bại: " + (err?.userMessage || err?.message || "Lỗi hệ thống"));
    } finally {
      setScanning(false);
    }
  };

  const filtered = useMemo(() => {
    const kw = query.trim().toLowerCase();
    return entries.filter((e) => {
      const matchTab = activeTab === "ALL" || e.status === "ALERT" || e.status === "FAILED" || e.status === "BLOCKED";
      const matchAction = actionFilter === "ALL" || e.action === actionFilter;
      const matchQuery = !kw || e.user.toLowerCase().includes(kw) || e.target.toLowerCase().includes(kw) || e.detail.toLowerCase().includes(kw) || e.ipAddress.includes(kw);
      return matchTab && matchAction && matchQuery;
    });
  }, [entries, query, actionFilter, activeTab]);

  return (
    <div className="space-y-6 md:space-y-10">
      <PageHeader
        breadcrumbs={[{ label: "Quản trị" }, { label: "Sổ kiểm toán" }]}
        title="Sổ kiểm toán hệ thống"
        subtitle="Bản ghi hoạt động bất biến — theo dõi toàn bộ sự kiện hệ thống."
        rightSlot={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={handleScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 rounded-xl btn-primary-gradient px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${scanning ? "animate-spin" : ""}`}>
                {scanning ? "sync" : "security"}
              </span>
              {scanning ? "Đang quét..." : "Quét toàn vẹn dữ liệu"}
            </button>
            <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-3 py-2 text-[11px] font-mono text-outline ghost-border sm:w-auto sm:justify-start sm:px-4 sm:text-xs">
              <span className="material-symbols-outlined text-primary text-[14px]">lock</span>
              {stats.totalEvents} bản ghi • Bất biến
            </div>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-6">
        <StatCard icon="receipt_long" label="Tổng sự kiện" value={stats.totalEvents} iconColor="text-primary" orbColor="bg-primary-container/10" />
        <StatCard icon="check_circle" label="Thành công" value={stats.successCount} iconColor="text-secondary" orbColor="bg-secondary-container/20" />
        <StatCard icon="warning" label="Cảnh báo / Chặn" value={stats.warningOrBlockedCount} iconColor="text-tertiary" orbColor="bg-tertiary-container/10" />
        <StatCard icon="cancel" label="Thất bại" value={stats.failedCount} iconColor="text-error" orbColor="bg-error-container/10" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 px-1">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === "ALL"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          Tất cả nhật ký
        </button>
        <button
          id="alert-tab"
          onClick={() => setActiveTab("ALERT")}
          className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 relative ${
            activeTab === "ALERT"
              ? "border-red-500 text-red-600"
              : "border-transparent text-slate-500 hover:text-red-500"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">warning</span>
          Cảnh báo & Vi phạm
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 ghost-border ambient-shadow sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:p-5">
        {/* Search */}
        <div className="relative w-full flex-1 sm:min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">search</span>
          <input
            id="audit-query"
            type="text"
            placeholder="Tìm theo user, target, IP..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {/* Action filter chips */}
        <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
          {ALL_ACTIONS.map((a) => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-all sm:px-4 sm:py-1.5 ${
                actionFilter === a
                  ? "btn-primary-gradient text-white shadow-md"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {a === "ALL" ? "Tất cả" : getAuditActionLabel(a)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-surface-container-lowest ambient-shadow ghost-border">
        <div className="space-y-3 p-3 sm:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-xl bg-surface-container-low py-12 text-center">
              <span className="material-symbols-outlined text-4xl text-outline">manage_search</span>
              <p className="mt-3 text-sm text-on-surface-variant">Không tìm thấy bản ghi nào phù hợp.</p>
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <article
                key={entry.id}
                className={`rounded-xl border p-4 ${
                  entry.status === "ALERT" || entry.status === "FAILED"
                    ? "border-error/20 bg-error-container/10"
                    : entry.status === "BLOCKED"
                      ? "border-orange-200/50 bg-orange-50/20"
                      : "border-surface-container-high/30 bg-surface-container-low"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-outline">#{String(idx + 1).padStart(3, "0")}</p>
                    <p className="mt-1 truncate font-mono text-xs text-on-surface-variant">{formatTs(entry.timestamp)}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-semibold leading-snug whitespace-normal break-words ${ACTION_STYLES[entry.action] ?? "bg-surface-container text-on-surface"}`}>
                    {getAuditActionLabel(entry.action)}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-on-surface">{entry.user}</span>
                    <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ROLE_STYLES[entry.role] ?? "bg-surface-container text-on-surface"}`}>
                      {formatRoleLabel(entry.role)}
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs font-medium text-on-surface" title={entry.target}>{entry.target}</p>
                  <p className="text-xs text-on-surface-variant" title={entry.detail}>{entry.detail}</p>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate font-mono text-outline">{entry.ipAddress}</span>
                    <span className={`inline-flex items-center gap-1.5 font-mono font-bold ${STATUS_TEXT[entry.status] ?? "text-on-surface"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[entry.status] ?? "bg-outline"}`} />
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          {/* Table Header */}
          <div className="min-w-[1070px] grid grid-cols-[60px_180px_190px_150px_minmax(260px,1fr)_100px_130px] gap-4 px-6 py-4 bg-surface-container-high/50 font-headline text-xs font-bold text-on-surface-variant tracking-wider uppercase overflow-hidden">
            <div>#</div>
            <div>Thời gian</div>
            <div>Người dùng / Vai trò</div>
            <div>Hành động</div>
            <div>Mục tiêu / Chi tiết</div>
            <div>IP</div>
            <div className="text-right">Trạng thái</div>
          </div>

          {/* Table Body */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-4xl text-outline">manage_search</span>
              <p className="text-sm text-on-surface-variant mt-3">Không tìm thấy bản ghi nào phù hợp.</p>
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <div
                key={entry.id}
                className={`min-w-[1070px] grid grid-cols-[60px_180px_190px_150px_minmax(260px,1fr)_100px_130px] gap-4 items-start px-6 py-4 hover:bg-surface-container-low transition-colors group relative border-t border-surface-container-high/20 overflow-hidden ${
                  entry.status === "ALERT" || entry.status === "FAILED"
                    ? "bg-error-container/5"
                    : entry.status === "BLOCKED"
                      ? "bg-orange-50/5"
                      : ""
                }`}
              >
                {/* Accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${STATUS_DOT[entry.status] ?? "bg-surface-container-high"} opacity-0 group-hover:opacity-100`} />

                {/* # */}
                <div className="font-mono text-xs text-outline">
                  {String(idx + 1).padStart(3, "0")}
                </div>

                {/* Timestamp */}
                <div className="font-mono text-xs text-on-surface-variant whitespace-nowrap">
                  {formatTs(entry.timestamp)}
                </div>

                {/* User / Role */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="font-mono text-xs font-semibold text-on-surface truncate" title={entry.user}>{entry.user}</span>
                  <span className={`inline-flex w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide truncate ${ROLE_STYLES[entry.role] ?? "bg-surface-container text-on-surface"}`} title={formatRoleLabel(entry.role)}>
                    {formatRoleLabel(entry.role)}
                  </span>
                </div>

                {/* Action */}
                <div className="min-w-0">
                  <span className={`inline-flex max-w-[150px] items-center rounded-md px-2 py-1 text-xs font-semibold leading-snug whitespace-normal break-words ${ACTION_STYLES[entry.action] ?? "bg-surface-container text-on-surface"}`}>
                    {getAuditActionLabel(entry.action)}
                  </span>
                </div>

                {/* Target / Detail */}
                <div className="min-w-0 max-w-full flex flex-col gap-0.5">
                  <p className="font-mono text-xs font-medium text-on-surface truncate" title={entry.target}>{entry.target}</p>
                  <p className="text-xs text-slate-500 break-words line-clamp-2" title={entry.detail}>{entry.detail}</p>
                </div>

                {/* IP */}
                <div className="font-mono text-[11px] text-outline whitespace-nowrap">{entry.ipAddress}</div>

                {/* Status */}
                <div className="flex justify-end items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[entry.status] ?? "bg-outline"} shrink-0`} />
                  <span className={`font-mono text-[11px] font-bold truncate ${STATUS_TEXT[entry.status] ?? "text-on-surface"}`}>
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-stretch gap-3 border-t border-surface-container-high/30 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[11px] text-outline">
            Hiển thị {filtered.length} / {entries.length} bản ghi
          </p>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            {nextCursor !== null && (
              <button
                onClick={() => fetchCursorPage(nextCursor)}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-surface-container-high px-3 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-highest disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
                {loading ? "Đang tải..." : "Tải thêm"}
              </button>
            )}
            <span className="flex items-center gap-1 text-[11px] text-outline">
              <span className="material-symbols-outlined text-[12px]">lock</span>
              Chỉ đọc — Sổ cái bất biến
            </span>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
