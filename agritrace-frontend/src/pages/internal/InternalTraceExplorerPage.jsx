import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { Input } from "../../components/ui/Input";
import { traceService } from "../../services/traceService";

const PAGE_SIZE = 10;
const MAX_SEARCH_PAGES = 10;

function formatTs(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("vi-VN", { hour12: false });
}

export function InternalTraceExplorerPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const topbarQuery = searchParams.get("q")?.trim() ?? "";

  const [keyword, setKeyword] = useState(topbarQuery);
  const [page, setPage] = useState(0);
  const [resultPage, setResultPage] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setKeyword(topbarQuery);
    setPage(0);
  }, [topbarQuery]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await traceService.searchInternal({
          keyword: keyword.trim(),
          page,
          size: PAGE_SIZE,
        });
        if (!active) return;
        setResultPage({
          content: Array.isArray(payload?.content) ? payload.content : [],
          totalPages: Math.min(Number(payload?.totalPages ?? 0), MAX_SEARCH_PAGES),
          totalElements: Math.min(Number(payload?.totalElements ?? 0), MAX_SEARCH_PAGES * PAGE_SIZE),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.userMessage ?? t("internalTrace.cannotSearch"));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [keyword, page, t]);

  const rows = resultPage.content ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("internalTrace.crossRole")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{t("internalTrace.explorer")}</h1>
      </div>

      <Card>
        <Input
          id="internal-search"
          label={t("farmer.search")}
          placeholder="Batch code, operation, actor role, notes..."
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value);
            setPage(0);
          }}
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-on-surface-variant">{resultPage.totalElements} kết quả (tối đa 100)</span>
          {loading ? <span className="text-xs text-on-surface-variant">{t("internalTrace.searching")}</span> : null}
        </div>

        {rows.length === 0 && !loading ? (
          <div className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
            Không có dữ liệu phù hợp.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((item) => (
              <div key={item.auditId} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.operation} • {item.traceAction || "N/A"}</p>
                  <span className="text-xs text-slate-500">{formatTs(item.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Batch: {item.batchCode || "N/A"} • Role: {item.actorRole || "N/A"}</p>
                <p className="mt-1 text-sm text-slate-700">{item.notes || "—"}</p>
                {item.traceLogId ? (
                  <div className="mt-2">
                    <Link
                      to={`/internal/trace/${encodeURIComponent(item.traceLogId)}`}
                      className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      {t("internalTrace.openDetail")}
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <OffsetPagination
            page={page}
            totalPages={resultPage.totalPages}
            maxPageCount={MAX_SEARCH_PAGES}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  );
}
