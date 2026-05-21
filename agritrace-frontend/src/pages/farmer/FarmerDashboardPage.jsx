import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { BatchRow } from "../../components/ui/BatchRow";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { batchService } from "../../services/batchService";
import { farmService } from "../../services/farmService";

import { traceService } from "../../services/traceService";

function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function FarmerDashboardPage() {
  const { t } = useTranslation();
  const [farms, setFarms] = useState([]);
  const [recentBatches, setRecentBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({ totalBatches: 0, pendingInspection: 0, reviewed: 0 });

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
          const farmBatches = await Promise.all(
            nextFarms.map((farm) => batchService.getBatchesByFarm(farm.id)),
          );
          const flatBatches = farmBatches.flat();

          const inspectionFlags = await Promise.all(
            flatBatches.map(async (batch) => {
              try {
                const batchId = batch.id;
                if (!batchId) return false;
                const logs = await traceService.getTraceLogsByBatchId(batchId);
                return logs.some((log) => log.action === "INSPECTION");
              } catch {
                return false;
              }
            }),
          );

          const reviewed = inspectionFlags.filter(Boolean).length;
          const pendingInspection = Math.max(flatBatches.length - reviewed, 0);

          const enrichedBatches = flatBatches.map((batch, index) => {
            const isInspected = inspectionFlags[index];
            let displayStatus = batch.status;
            if (displayStatus === "ACTIVE" || displayStatus === "PENDING_INSPECTION" || !displayStatus) {
              displayStatus = isInspected ? "INSPECTED" : "PENDING_INSPECTION";
            }
            return { ...batch, displayStatus };
          });

          enrichedBatches.sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          if (active) {
            setOverview({ totalBatches: flatBatches.length, pendingInspection, reviewed });
            // Show 5 most recent
            setRecentBatches(enrichedBatches.slice(0, 5));
          }
        }
      } catch (err) {
        if (active) {
          setError(err?.userMessage ?? t("farmer.dashboardUnavailable"));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return <StateCard title="Dashboard unavailable" message={error} tone="error" className="max-w-2xl" />;
  }

  if (farms.length === 0) {
    return (
      <div className="space-y-10">
        <PageHeader
          title={t("farmer.dashboard")}
          subtitle={t("farmer.operationalOverviewDesc")}
        />
        <StateCard
          title={t("farmer.noFarmsYet")}
          message={t("farmer.noFarmsYetDesc")}
          action={{ label: t("farmer.createFirstFarm"), to: "/farmer/farms/new", variant: "primary" }}
          className="max-w-2xl"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <PageHeader
        title={t("farmer.dashboard")}
        subtitle="Theo dõi hành trình canh tác và tình trạng lô hàng."
        rightSlot={
          <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-lg ambient-shadow">
            <span className="material-symbols-outlined text-outline text-[16px]">calendar_today</span>
            <span className="text-sm font-medium text-on-surface-variant">{todayLabel()}</span>
          </div>
        }
      />

      {/* Alert banner if pending inspections */}
      {overview.pendingInspection > 0 && (
        <div className="bg-tertiary-container/20 border-l-4 border-tertiary rounded-r-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary mt-0.5">warning</span>
          <div>
            <h4 className="font-headline font-bold text-on-tertiary-container">Cần xử lý</h4>
            <p className="text-sm text-on-tertiary-container/80 mt-1">
              {overview.pendingInspection} lô đang chờ kiểm định.{" "}
              <Link to="/farmer/batches" className="underline font-semibold hover:text-tertiary transition-colors">
                Xem danh sách →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid — Bento style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon="layers"
          label="Tổng số lô hàng"
          value={overview.totalBatches}
          orbColor="bg-primary-container/10"
          iconColor="text-primary"
        />
        <StatCard
          icon="assignment_late"
          label="Chờ kiểm định"
          value={overview.pendingInspection}
          orbColor="bg-tertiary-container/10"
          iconColor="text-tertiary"
        />
        <StatCard
          icon="qr_code"
          label="Đã kiểm định"
          value={overview.reviewed}
          orbColor="bg-secondary-container/20"
          iconColor="text-secondary"
        />
      </div>

      {/* Recent Batches */}
      <div className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface tracking-tight">
            Lô hàng gần đây
          </h3>
          <Link
            to="/farmer/batches"
            className="text-sm font-semibold text-primary hover:text-primary-container transition-colors flex items-center gap-1"
          >
            Xem tất cả
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {recentBatches.length === 0 ? (
          <p className="text-sm text-on-surface-variant py-8 text-center">
            Chưa có lô hàng nào. Hãy tạo lô đầu tiên!
          </p>
        ) : (
          <div className="space-y-3">
            {recentBatches.map((batch) => (
              <BatchRow
                key={batch.id}
                batchCode={batch.batchCode}
                productName={batch.productName}
                status={batch.displayStatus}
                updatedAt={batch.createdAt}
                detailTo={`/farmer/batches/${encodeURIComponent(batch.batchCode)}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
