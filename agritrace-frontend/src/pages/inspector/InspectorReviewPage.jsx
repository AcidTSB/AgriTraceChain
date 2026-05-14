import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { useToast } from "../../hooks/useToast";
import { batchService } from "../../services/batchService";
import { inspectorQueueService } from "../../services/inspectorQueueService";
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

  const [batchCodeInput, setBatchCodeInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingCode, setProcessingCode] = useState("");

  const topbarQuery = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const buildQueueRows = useCallback(
    async (codes) => {
      return Promise.all(
        codes.map(async (code) => {
          const normalizedCode = String(code ?? "").trim().toUpperCase();

          if (!inspectorQueueService.isSupportedCode(normalizedCode)) {
            return {
              code: normalizedCode,
              batch: null,
              pending: false,
              logsCount: 0,
              updatedAt: "",
              error: "Mã lô không hợp lệ. Chỉ hỗ trợ định dạng BATCH-...",
            };
          }

          try {
            const batch = await batchService.getBatchByCode(normalizedCode);
            const batchId = batch?.id;
            if (!batchId) {
              throw new Error("Cannot resolve batchId from batchCode.");
            }
            const logs = await traceService.getTraceLogsByBatchId(batchId);
            const pending = isPendingInspection(logs);
            return {
              code: normalizedCode,
              batch,
              pending,
              logsCount: logs.length,
              updatedAt: logs.at(-1)?.timestamp || batch?.updatedAt,
              error: "",
            };
          } catch {
            return {
              code: normalizedCode,
              batch: null,
              pending: false,
              logsCount: 0,
              updatedAt: "",
              error: t("inspector.cannotLoadBatchCode"),
            };
          }
        }),
      );
    },
    [t],
  );

  const refreshQueue = useCallback(
    async (codes = inspectorQueueService.getCodes()) => {
      setRefreshing(true);
      try {
        const nextRows = await buildQueueRows(codes);
        setRows(nextRows);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildQueueRows],
  );

  useEffect(() => {
    let active = true;
    let refreshTimer;

    const initialize = async () => {
      try {
        const removedCode = location.state?.removedCode?.trim();
        const refreshRequested = Boolean(location.state?.refresh);
        let codes = inspectorQueueService.sanitizeStoredCodes();
        if (removedCode) {
          codes = codes.filter((item) => item !== removedCode);
          inspectorQueueService.replaceAll(codes);
        }
        const nextRows = await buildQueueRows(codes);
        if (!active) return;
        setRows(nextRows);
        if (refreshRequested) {
          refreshTimer = setTimeout(() => {
            if (!active) return;
            refreshQueue(codes);
          }, 500);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (location.state?.toast) success(location.state.toast);
    initialize();
    if (location.state) navigate(location.pathname, { replace: true, state: null });

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [buildQueueRows, location.pathname, location.state, navigate, refreshQueue, success]);

  const pendingCount = useMemo(() => rows.filter((item) => item.pending).length, [rows]);
  const visibleRows = useMemo(() => {
    if (!topbarQuery) return rows;
    return rows.filter((row) => {
      const text = `${row.code} ${row.batch?.productName ?? ""} ${row.batch?.farmName ?? ""}`.toLowerCase();
      return text.includes(topbarQuery);
    });
  }, [rows, topbarQuery]);
  const isQueueBusy = loading || refreshing;

  const addBatchCode = async (event) => {
    event.preventDefault();
    const code = batchCodeInput.trim().toUpperCase();
    if (!code) {
      setInputError(t("inspector.batchCodeRequired"));
      return;
    }

    if (!inspectorQueueService.isSupportedCode(code)) {
      setInputError("Mã lô không hợp lệ. Vui lòng dùng định dạng BATCH-...");
      return;
    }

    setInputError("");
    const nextCodes = inspectorQueueService.addCode(code);
    setBatchCodeInput("");
    await refreshQueue(nextCodes);
  };

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
            <span className="w-2 h-2 rounded-full bg-primary-container" />
            <span className="text-sm font-medium text-on-surface-variant">
              {pendingCount} chờ kiểm định
            </span>
            <div className="w-px h-4 bg-outline-variant/30" />
            <button
              onClick={() => refreshQueue()}
              disabled={refreshing}
              className="flex items-center gap-1 text-sm text-primary font-semibold hover:opacity-75 transition-opacity"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              {refreshing ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        }
      />

      {/* Add batch code form */}
      <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow p-5">
        <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">
          Thêm lô vào hàng đợi
        </h3>
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={addBatchCode}>
          <Input
            id="queue-batch-code"
            placeholder={t("public.enterBatchCode")}
            value={batchCodeInput}
            error={inputError}
            onChange={(event) => {
              setBatchCodeInput(event.target.value);
              if (inputError) setInputError("");
            }}
          />
          <div className="flex items-end">
            <Button type="submit" disabled={isQueueBusy || Boolean(processingCode)}>
              <span className="material-symbols-outlined text-[18px]">add_task</span>
              {isQueueBusy ? t("common.processing") : t("inspector.addToQueue")}
            </Button>
          </div>
        </form>
      </div>

      {/* Queue table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl ambient-shadow p-12 text-center max-w-2xl mx-auto flex flex-col items-center ghost-border">
          <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              task_alt
            </span>
          </div>
          <h3 className="font-headline text-2xl font-bold text-on-surface mb-2 tracking-tight">
            Hàng đợi trống!
          </h3>
          <p className="font-body text-on-surface-variant text-base max-w-sm">
              {topbarQuery ? `Không tìm thấy kết quả cho "${searchParams.get("q")}".` : t("inspector.noBatchesInQueueDesc")}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl ambient-shadow overflow-hidden ghost-border">
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
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-surface-container-high group-hover:bg-primary transition-colors" />

                {/* Batch code */}
                <div className="col-span-3">
                  <button
                    className="font-headline font-bold text-primary hover:text-primary-container transition-colors flex items-center gap-2 text-left"
                    onClick={() => openBatchDetail(row.code)}
                    disabled={isQueueBusy || (Boolean(processingCode) && processingCode !== row.code)}
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
                    {row.batch?.productName || t("inspector.unknownProduct")}
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
                  {row.error ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container/30 text-on-error-container font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-error" />
                      Lỗi tải
                    </span>
                  ) : row.pending ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-body text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline" />
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
                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    className="font-body text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container-low px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    onClick={() => openBatchDetail(row.code)}
                    disabled={isQueueBusy || (Boolean(processingCode) && processingCode !== row.code)}
                  >
                    {processingCode === row.code ? "Đang mở..." : "Xem chi tiết"}
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                  <button
                    className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                    title="Xóa khỏi hàng đợi"
                    disabled={isQueueBusy || Boolean(processingCode)}
                    onClick={() => {
                      inspectorQueueService.removeCode(row.code);
                      setRows((prev) => prev.filter((item) => item.code !== row.code));
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_outline</span>
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
