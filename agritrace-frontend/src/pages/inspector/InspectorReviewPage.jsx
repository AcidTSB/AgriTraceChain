import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { apiClient, unwrapApiResponse } from "../../services/apiClient";
import { traceService } from "../../services/traceService";

function isPendingInspection(logs) {
  return !logs.some((item) => item.action === "INSPECTION");
}

export function InspectorReviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { success } = useToast();
  const { t } = useTranslation();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingCode, setProcessingCode] = useState("");

  const topbarQuery = searchParams.get("q")?.trim().toLowerCase() ?? "";

  // Fetch ALL batches from the backend, enrich with trace-log inspection status
  const loadAllBatches = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await apiClient.get(
        "/api/v1/batches/page?page=0&size=200&status=ALL&sort=updatedAt,desc"
      );
      const payload = unwrapApiResponse(response);
      const batches = Array.isArray(payload?.content) ? payload.content : [];

      const enriched = await Promise.all(
        batches.map(async (batch) => {
          if (batch.isCompromised || batch.status === "COMPROMISED") {
            return {
              code: batch.batchCode,
              batch,
              pending: false,
              logsCount: 0,
              updatedAt: batch.updatedAt,
              error: "",
              compromised: true,
            };
          }

          try {
            const batchId = batch.id;
            if (!batchId) throw new Error("No batchId");
            const logs = await traceService.getTraceLogsByBatchId(batchId);
            const pending = isPendingInspection(logs);
            return {
              code: batch.batchCode,
              batch,
              pending,
              logsCount: logs.length,
              updatedAt: logs.at(-1)?.timestamp || batch.updatedAt,
              error: "",
              compromised: false,
            };
          } catch {
            return {
              code: batch.batchCode,
              batch,
              pending: true,
              logsCount: 0,
              updatedAt: batch.updatedAt,
              error: t("inspector.cannotLoadBatchCode"),
              compromised: false,
            };
          }
        })
      );

      setRows(enriched);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    if (location.state?.toast) success(location.state.toast);
    if (location.state) navigate(location.pathname, { replace: true, state: null });

    loadAllBatches();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.pending && !r.compromised).length,
    [rows]
  );

  const visibleRows = useMemo(() => {
    if (!topbarQuery) return rows;
    return rows.filter((row) => {
      const text =
        `${row.code} ${row.batch?.productName ?? ""} ${row.batch?.farmName ?? ""}`.toLowerCase();
      return text.includes(topbarQuery);
    });
  }, [rows, topbarQuery]);

  const isQueueBusy = loading || refreshing;

  const openBatchDetail = (code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    setProcessingCode(normalized);
    navigate(`/inspector/batches/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <PageHeader
        title={t("inspector.reviewQueue")}
        subtitle={t("inspector.pendingExplain")}
        rightSlot={
          <div className="flex items-center gap-3 bg-surface-container-lowest px-4 py-2 rounded-lg ambient-shadow">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            <span className="text-sm font-medium text-on-surface-variant">
              {pendingCount} chờ kiểm định
            </span>
            <div className="w-px h-4 bg-outline-variant/30" />
            <button
              onClick={loadAllBatches}
              disabled={refreshing}
              className="flex items-center gap-1 text-sm text-primary font-semibold hover:opacity-75 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              {refreshing ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        }
      />

      {/* Queue table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-12 text-center max-w-2xl mx-auto flex flex-col items-center ghost-border">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
            <span
              className="material-symbols-outlined text-4xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              task_alt
            </span>
          </div>
          <h3 className="font-headline text-2xl font-bold text-on-surface mb-2 tracking-tight">
            {topbarQuery ? "Không tìm thấy kết quả" : "Không có lô hàng nào"}
          </h3>
          <p className="font-body text-on-surface-variant text-base max-w-sm">
            {topbarQuery
              ? `Không tìm thấy kết quả cho "${searchParams.get("q")}".`
              : "Chưa có lô hàng nào trong hệ thống."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden ghost-border">
          {/* Summary bar */}
          <div className="px-6 py-3 bg-surface-container-high/30 border-b border-surface-container-high flex items-center gap-6 text-xs text-on-surface-variant">
            <span className="font-semibold">{rows.length} lô hàng</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              {pendingCount} chờ kiểm định
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
              {rows.filter((r) => !r.pending && !r.compromised && !r.error).length} đã kiểm định
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-high/50 border-b border-surface-container-high font-body text-xs font-bold text-on-surface-variant tracking-wider uppercase">
            <div className="col-span-3">Mã lô</div>
            <div className="col-span-3">Sản phẩm / Nông trại</div>
            <div className="col-span-2">Trace records</div>
            <div className="col-span-2">Trạng thái</div>
            <div className="col-span-2 text-right">Thao tác</div>
          </div>

          <div className="flex flex-col divide-y divide-surface-container-high/30">
            {visibleRows.map((row) => (
              <div
                key={row.code}
                className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-surface-container-low transition-colors group relative"
              >
                {/* Accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${
                    row.compromised
                      ? "bg-error"
                      : row.pending
                      ? "bg-tertiary"
                      : "bg-primary"
                  }`}
                />

                {/* Batch code */}
                <div className="col-span-3">
                  <button
                    className="font-headline font-bold text-primary hover:text-primary-container transition-colors flex items-center gap-2 text-left"
                    onClick={() => openBatchDetail(row.code)}
                    disabled={
                      isQueueBusy ||
                      (Boolean(processingCode) && processingCode !== row.code)
                    }
                  >
                    {row.code}
                    <span className="material-symbols-outlined text-[16px] opacity-0 group-hover:opacity-100 transition-opacity">
                      open_in_new
                    </span>
                  </button>
                </div>

                {/* Product / Farm */}
                <div className="col-span-3">
                  <span className="font-body text-sm font-medium text-on-surface">
                    {row.batch?.productName?.replace(/^\[MOCK\]\s*/i, "") ||
                      t("inspector.unknownProduct")}
                  </span>
                  <p className="font-body text-xs text-on-surface-variant">
                    {row.batch?.farmName || t("inspector.unknownFarm")}
                  </p>
                </div>

                {/* Logs count */}
                <div className="col-span-2 font-body text-sm text-on-surface-variant">
                  {row.logsCount} bản ghi
                </div>

                {/* Status badge */}
                <div className="col-span-2">
                  {row.compromised ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container/30 text-on-error-container font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      Vi phạm toàn vẹn
                    </span>
                  ) : row.error ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container/30 text-on-error-container font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      Lỗi tải
                    </span>
                  ) : row.pending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-tertiary-container/20 text-on-tertiary-container font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                      Chờ kiểm định
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary-container/30 text-on-secondary-container font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                      Đã kiểm định
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end">
                  <button
                    className="font-body text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    onClick={() => openBatchDetail(row.code)}
                    disabled={
                      isQueueBusy ||
                      (Boolean(processingCode) && processingCode !== row.code)
                    }
                  >
                    {processingCode === row.code ? "Đang mở..." : "Xem chi tiết"}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
