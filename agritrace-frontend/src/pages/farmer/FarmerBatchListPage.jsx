import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { BatchRow } from "../../components/ui/BatchRow";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { batchService } from "../../services/batchService";
import { farmService } from "../../services/farmService";
import { traceService } from "../../services/traceService";

const PAGE_SIZE = 10;

export function FarmerBatchListPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const topbarQuery = searchParams.get("q")?.trim() ?? "";

  const [farms, setFarms] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  
  const [farmFilter, setFarmFilter] = useState("all");
  const [search, setSearch] = useState(topbarQuery);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  useEffect(() => {
    setSearch(topbarQuery);
    setPage(0);
  }, [topbarQuery]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const nextFarms = await farmService.getMyFarms();
        if (!active) return;
        setFarms(nextFarms);

        if (nextFarms.length > 0) {
          // Fetch all batches for all farms at once to compute trace log status
          const farmBatches = await Promise.all(
            nextFarms.map((farm) => batchService.getBatchesByFarm(farm.id))
          );
          const flatBatches = farmBatches.flat();

          // Compute inspection flags
          const inspectionFlags = await Promise.all(
            flatBatches.map(async (batch) => {
              if (batch.isCompromised || batch.status === "COMPROMISED") return false;
              try {
                const batchId = batch.id;
                if (!batchId) return false;
                const logs = await traceService.getTraceLogsByBatchId(batchId);
                return logs.some((log) => log.action === "INSPECTION");
              } catch {
                return false;
              }
            })
          );

          const enrichedBatches = flatBatches.map((batch, index) => {
            const isInspected = inspectionFlags[index];
            let displayStatus = batch.status;
            if (displayStatus === "ACTIVE" || displayStatus === "PENDING_INSPECTION" || !displayStatus) {
              displayStatus = isInspected ? "INSPECTED" : "PENDING_INSPECTION";
            }
            if (batch.isCompromised) {
              displayStatus = "COMPROMISED";
            }
            return { ...batch, displayStatus };
          });

          // Sort by date descending
          enrichedBatches.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          if (active) {
            setAllBatches(enrichedBatches);
          }
        }
      } catch (err) {
        if (active) {
          setError(err?.userMessage ?? t("farmer.batchListUnavailable"));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, [t]);

  // Local filtering and pagination
  const { visibleBatches, totalElements, totalPages } = useMemo(() => {
    let filtered = allBatches;

    if (farmFilter !== "all") {
      filtered = filtered.filter(b => b.farmId === farmFilter);
    }

    if (statusFilter !== "ALL") {
      filtered = filtered.filter(b => b.displayStatus === statusFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(b => 
        (b.batchCode?.toLowerCase().includes(q)) || 
        (b.productName?.toLowerCase().includes(q))
      );
    }

    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / PAGE_SIZE) || 1;
    const start = page * PAGE_SIZE;
    const visibleBatches = filtered.slice(start, start + PAGE_SIZE);

    return { visibleBatches, totalElements, totalPages };
  }, [allBatches, farmFilter, statusFilter, search, page]);

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
          onChange={handleStatusChange}
          className="bg-slate-50 rounded-xl px-3 py-2 text-sm ghost-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-on-surface"
        >
          <option value="ALL">{t("farmer.filterAllInspections")}</option>
          <option value="PENDING_INSPECTION">{t("inspection.awaiting")}</option>
          <option value="INSPECTED">{t("inspection.inspected")}</option>
          <option value="COMPROMISED">{t("inspection.compromised")}</option>
        </select>
      </div>

      {allBatches.length === 0 ? (
        <StateCard title={t("farmer.noBatchesYet")} message={t("farmer.createFirstBatchDesc")} />
      ) : visibleBatches.length === 0 ? (
        <StateCard title="Không tìm thấy kết quả" message="Không có lô hàng nào phù hợp với bộ lọc." />
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline text-lg font-bold text-on-surface">Tất cả lô hàng</h3>
            <span className="text-sm text-on-surface-variant font-mono">{totalElements} kết quả</span>
          </div>

          <div className="space-y-3">
            {visibleBatches.map((item) => (
              <BatchRow
                key={item.id}
                batchCode={item.batchCode}
                productName={item.productName}
                status={item.displayStatus}
                updatedAt={item.updatedAt}
                detailTo={`/farmer/batches/${encodeURIComponent(item.batchCode)}`}
              />
            ))}
          </div>
        </section>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end">
          <OffsetPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
