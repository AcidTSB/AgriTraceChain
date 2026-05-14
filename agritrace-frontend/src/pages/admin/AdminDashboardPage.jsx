import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatCard } from "../../components/ui/StatCard";
import { Skeleton } from "../../components/ui/Skeleton";
import { productService } from "../../services/productService";
import { apiClient } from "../../services/apiClient";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        if (!active) return;
        const [productsResult, usersResult, farmsResult] = await Promise.allSettled([
          productService.getProducts(),
          apiClient.get("/api/v1/users/count"),
          apiClient.get("/api/v1/farms/count"),
        ]);

        if (!active) return;

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

        setStats({
          products: productsCount,
          users: usersCount,
          facilities: farmsCount,
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

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
          <div className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-3 py-2 ambient-shadow sm:w-auto sm:justify-start sm:px-4">
            <span className="material-symbols-outlined text-outline text-[16px]">calendar_today</span>
            <span className="truncate text-xs font-medium text-on-surface-variant sm:text-sm">{todayLabel()}</span>
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
