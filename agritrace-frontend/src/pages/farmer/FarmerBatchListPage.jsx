import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { BatchRow } from "../../components/ui/BatchRow";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { batchService } from "../../services/batchService";
import { farmService } from "../../services/farmService";

const PAGE_SIZE = 10;

export function FarmerBatchListPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const topbarQuery = searchParams.get("q")?.trim() ?? "";

  const [farms, setFarms] = useState([]);
  const [batchesPage, setBatchesPage] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [farmFilter, setFarmFilter] = useState("all");
  const [search, setSearch] = useState(topbarQuery);
  const [statusFilter, setStatusFilter] = useState("PENDING_INSPECTION");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setSearch(topbarQuery);
    setPage(0);
  }, [topbarQuery]);

  useEffect(() => {
    let active = true;
    const loadFarms = async () => {
      try {
        const payload = await farmService.getMyFarms();
        if (active) setFarms(payload);
      } catch {
        if (active) setFarms([]);
      }
    };
    loadFarms();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await batchService.getBatchesPage({
          page,
          size: PAGE_SIZE,
          sort: "updatedAt,desc",
          status: statusFilter,
          q: search.trim(),
          farmId: farmFilter === "all" ? undefined : farmFilter,
        });
        if (!active) return;
        setBatchesPage({
          content: Array.isArray(payload?.content) ? payload.content : [],
          totalPages: Number(payload?.totalPages ?? 0),
          totalElements: Number(payload?.totalElements ?? 0),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.userMessage ?? t("farmer.batchListUnavailable"));
      } finally {
        if (active) setLoading(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, farmFilter, search, statusFilter, t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <StateCard title={t("farmer.batchListUnavailable")} message={error} tone="error" />;
  }

  const rows = batchesPage.content ?? [];

  return (
    <div className="space-y-10">
      <PageHeader
        title={t("sidebar.farmer.batchList")}
        subtitle="Quản lý và theo dõi toàn bộ lô hàng của bạn."
        breadcrumbs={[
          { label: "Tổng quan", to: "/farmer/dashboard" },
          { label: "Danh sách lô" },
        ]}
        rightSlot={(
          <Link
            to="/farmer/batches/new"
            className="btn-primary-gradient text-white rounded-xl px-5 py-2.5 font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            {t("farmer.createBatch")}
          </Link>
        )}
      />

      <div className="bg-surface-container-lowest rounded-xl ghost-border ambient-shadow p-4 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t("farmer.batchCodeOrProduct")}
            className="w-full bg-slate-50 rounded-full pl-10 pr-4 py-2 text-sm ghost-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
          />
        </div>

        <select
          value={farmFilter}
          onChange={(e) => {
            setFarmFilter(e.target.value);
            setPage(0);
          }}
          className="bg-slate-50 rounded-xl px-3 py-2 text-sm ghost-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
        >
          <option value="all">{t("farmer.allFarms")}</option>
          {farms.map((farm) => (
            <option key={farm.id} value={String(farm.id)}>
              {farm.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="bg-slate-50 rounded-xl px-3 py-2 text-sm ghost-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
        >
          <option value="PENDING_INSPECTION">{t("inspection.awaiting")}</option>
          <option value="COMPROMISED">COMPROMISED</option>
          <option value="ALL">{t("farmer.filterAllInspections")}</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <StateCard title={t("farmer.noBatchesYet")} message={t("farmer.createFirstBatchDesc")} />
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-lg font-bold text-on-surface">Tất cả lô hàng</h3>
            <span className="text-sm text-on-surface-variant font-mono">{batchesPage.totalElements} kết quả</span>
          </div>

          <div className="space-y-3">
            {rows.map((item) => (
              <BatchRow
                key={item.id}
                batchCode={item.batchCode}
                productName={item.productName}
                status={item.status}
                updatedAt={item.updatedAt}
                detailTo={`/farmer/batches/${encodeURIComponent(item.batchCode)}`}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center justify-end">
        <OffsetPagination page={page} totalPages={batchesPage.totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
