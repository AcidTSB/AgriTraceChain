import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Skeleton } from "../../components/ui/Skeleton";
import { inspectorQueueService } from "../../services/inspectorQueueService";
import { batchService } from "../../services/batchService";
import { traceService } from "../../services/traceService";

function isPending(logs) {
  return !logs.some((item) => item.action === "INSPECTION");
}

function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
}

export function InspectorDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0, inaccessible: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const codes = inspectorQueueService.getCodes();
        const summary = await Promise.all(
          codes.map(async (code) => {
            if (!inspectorQueueService.isSupportedCode(code)) {
              return "inaccessible";
            }

            try {
              const batch = await batchService.getBatchByCode(code);
              const batchId = batch?.id;
              if (!batchId) {
                return "inaccessible";
              }
              const logs = await traceService.getTraceLogsByBatchId(batchId);
              return isPending(logs) ? "pending" : "reviewed";
            } catch {
              return "inaccessible";
            }
          }),
        );
        if (!active) return;
        const pending = summary.filter((item) => item === "pending").length;
        const reviewed = summary.filter((item) => item === "reviewed").length;
        const inaccessible = summary.filter((item) => item === "inaccessible").length;
        setStats({ total: codes.length, pending, reviewed, inaccessible });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={t("inspector.dashboard")}
        subtitle="Tổng quan hàng đợi kiểm định và các lô hàng đang xử lý."
        rightSlot={
          <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-lg ambient-shadow">
            <span className="material-symbols-outlined text-outline text-[16px]">calendar_today</span>
            <span className="text-sm font-medium text-on-surface-variant">{todayLabel()}</span>
          </div>
        }
      />

      {/* Alert banner */}
      {stats.pending > 0 && (
        <div className="bg-tertiary-container/20 border-l-4 border-tertiary rounded-r-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary mt-0.5">assignment_late</span>
          <div>
            <h4 className="font-headline font-bold text-on-tertiary-container">Cần xử lý</h4>
            <p className="text-sm text-on-tertiary-container/80 mt-1">
              {stats.pending} lô đang chờ kiểm định.{" "}
              <Link to="/inspector/review" className="underline font-semibold hover:text-tertiary transition-colors">
                Vào hàng đợi →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon="layers"
          label="Tổng lô trong queue"
          value={stats.total}
          orbColor="bg-primary-container/10"
          iconColor="text-primary"
        />
        <StatCard
          icon="assignment_late"
          label="Chờ kiểm định"
          value={stats.pending}
          orbColor="bg-tertiary-container/10"
          iconColor="text-tertiary"
        />
        <StatCard
          icon="task_alt"
          label="Đã kiểm định"
          value={stats.reviewed}
          orbColor="bg-secondary-container/20"
          iconColor="text-secondary"
        />
        <StatCard
          icon="report_problem"
          label="Không truy cập được"
          value={stats.inaccessible}
          orbColor="bg-error-container/10"
          iconColor="text-error"
        />
      </div>

      {/* Quick actions */}
      <div className="bg-surface-container-low rounded-2xl p-6 lg:p-8">
        <h3 className="font-headline text-xl font-bold text-on-surface tracking-tight mb-6">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/inspector/review">
            <div className="bg-surface-container-lowest rounded-xl p-5 ghost-border hover:shadow-sm transition-shadow flex items-center gap-4 cursor-pointer group">
              <div className="w-12 h-12 rounded-xl btn-primary-gradient flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_turned_in</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Hàng đợi kiểm định</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Xem và xử lý các lô hàng đang chờ</p>
              </div>
              <span className="material-symbols-outlined text-outline ml-auto group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
          </Link>
          <Link to="/internal/trace">
            <div className="bg-surface-container-lowest rounded-xl p-5 ghost-border hover:shadow-sm transition-shadow flex items-center gap-4 cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined">travel_explore</span>
              </div>
              <div>
                <h4 className="font-headline font-bold text-on-surface">Truy xuất lô hàng</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">Tìm kiếm và xem lịch sử bất kỳ lô</p>
              </div>
              <span className="material-symbols-outlined text-outline ml-auto group-hover:text-primary transition-colors">arrow_forward</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
