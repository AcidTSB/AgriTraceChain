import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Skeleton } from "../../components/ui/Skeleton";
import { productService } from "../../services/productService";
import { apiClient, unwrapApiResponse } from "../../services/apiClient";
import { traceService } from "../../services/traceService";

function todayLabel() {
  return new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });
}

const quickLinks = [
  { label: "Quản lý sản phẩm", desc: "Thêm, sửa, xóa sản phẩm nông nghiệp", icon: "inventory_2", to: "/admin/products" },
  { label: "Quản lý người dùng", desc: "Phân quyền Farmer, Inspector", icon: "group", to: "/admin/users" },
  { label: "Cơ sở sản xuất", desc: "Quản lý farms và facilities", icon: "warehouse", to: "/admin/facilities" },
  { label: "Audit Ledger", desc: "Theo dõi toàn bộ hoạt động hệ thống", icon: "policy", to: "/admin/audit" },
];

function normalizeCount(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  if (value && typeof value === "object") {
    const nestedCandidates = [value.data, value.count, value.total, value.totalElements];
    for (const candidate of nestedCandidates) {
      const parsed = normalizeCount(candidate, Number.NaN);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
}

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({ products: 0, users: 0, facilities: 0 });
  const [compromisedBatches, setCompromisedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const [productsResult, usersResult, farmsResult, compromisedResult] = await Promise.allSettled([
        productService.getProducts(),
        apiClient.get("/api/v1/users/count"),
        apiClient.get("/api/v1/farms/count"),
        apiClient.get("/api/v1/batches/page?page=0&size=100&status=COMPROMISED"),
      ]);

      const productsCount =
        productsResult.status === "fulfilled" && Array.isArray(productsResult.value)
          ? productsResult.value.length
          : 0;
      const usersCount =
        usersResult.status === "fulfilled"
          ? normalizeCount(usersResult.value?.data, 0)
          : 0;
      const farmsCount =
        farmsResult.status === "fulfilled"
          ? normalizeCount(farmsResult.value?.data, 0)
          : 0;

      const compromisedData =
        compromisedResult.status === "fulfilled"
          ? unwrapApiResponse(compromisedResult.value)
          : null;
      const compromisedList = Array.isArray(compromisedData?.content)
        ? compromisedData.content
        : [];

      setStats({
        products: productsCount,
        users: usersCount,
        facilities: farmsCount,
      });
      setCompromisedBatches(compromisedList);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (active) {
      loadData(true);
    }
    return () => { active = false; };
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
      await loadData(false);
    } catch (err) {
      alert("Quét toàn vẹn thất bại: " + (err?.userMessage || err?.message || "Lỗi hệ thống"));
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 md:space-y-8">
        <Skeleton className="h-10 w-56 sm:h-12 sm:w-72" />
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 md:space-y-10">
      <PageHeader
        title={t("admin.dashboard")}
        subtitle="Trung tâm điều hành hệ thống AgriTrace."
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
            <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 ambient-shadow sm:px-4">
              <span className="material-symbols-outlined text-outline text-[16px]">calendar_today</span>
              <span className="truncate text-xs font-medium text-on-surface-variant sm:text-sm">{todayLabel()}</span>
            </div>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 md:gap-6">
        <StatCard
          icon="inventory_2"
          label="Sản phẩm"
          value={stats.products}
          orbColor="bg-primary-container/10"
          iconColor="text-primary"
        />
        <StatCard
          icon="group"
          label="Người dùng"
          value={stats.users}
          orbColor="bg-secondary-container/20"
          iconColor="text-secondary"
        />
        <StatCard
          icon="warehouse"
          label="Cơ sở sản xuất"
          value={stats.facilities}
          orbColor="bg-tertiary-container/10"
          iconColor="text-tertiary"
        />
      </div>

      {/* Compromised Batches Warnings Card */}
      {compromisedBatches.length > 0 && (
        <div className="rounded-2xl border border-error/30 bg-error-container/10 p-5 md:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-error text-3xl">warning</span>
            <div>
              <h3 className="font-headline text-lg font-bold tracking-tight text-on-error-container">
                Cảnh báo xâm phạm dữ liệu ({compromisedBatches.length})
              </h3>
              <p className="text-xs text-on-error-container/80">
                Phát hiện các lô hàng có dấu hiệu vi phạm tính toàn vẹn dữ liệu. Cần kiểm tra ngay lập tức.
              </p>
            </div>
          </div>
          
          <div className="divide-y divide-error/10 max-h-[300px] overflow-y-auto pr-2">
            {compromisedBatches.map((batch) => (
              <div key={batch.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-error">{batch.batchCode}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-error-container/20 text-on-error-container font-medium">
                      {batch.productName}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Lý do: {batch.compromiseReason || "Không có lý do chi tiết"}
                  </p>
                </div>
                <Link
                  to={`/admin/trace/${encodeURIComponent(batch.batchCode)}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-error hover:underline"
                >
                  Xem chi tiết
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links Grid */}
      <div className="rounded-2xl bg-surface-container-low p-4 sm:p-5 md:p-6 lg:p-8">
        <h3 className="mb-4 font-headline text-lg font-bold tracking-tight text-on-surface sm:mb-6 sm:text-xl">Quản lý hệ thống</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="block">
              <div className="group flex cursor-pointer items-center gap-3 rounded-xl bg-surface-container-lowest p-4 transition-all hover:shadow-sm sm:gap-4 sm:p-5 ghost-border">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-primary transition-all group-hover:btn-primary-gradient group-hover:text-white sm:h-12 sm:w-12">
                  <span className="material-symbols-outlined">{link.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-headline text-sm font-bold text-on-surface transition-colors group-hover:text-primary sm:text-base">{link.label}</h4>
                  <p className="mt-0.5 text-xs leading-relaxed text-on-surface-variant">{link.desc}</p>
                </div>
                <span className="material-symbols-outlined ml-auto shrink-0 text-outline transition-colors group-hover:text-primary">arrow_forward</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
