import { useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

// ─── Icon map: labelKey → Material Symbol name ────────────────────────────
const iconMap = {
  "sidebar.farmer.dashboard": "dashboard",
  "sidebar.farmer.createFarm": "add_home",
  "sidebar.farmer.products": "inventory_2",
  "sidebar.farmer.batchList": "layers",
  "sidebar.farmer.createBatch": "add_circle",
  "sidebar.farmer.internalExplorer": "travel_explore",
  "sidebar.farmer.settings": "settings",
  "sidebar.inspector.dashboard": "dashboard",
  "sidebar.inspector.reviewQueue": "assignment_turned_in",
  "sidebar.inspector.internalExplorer": "travel_explore",
  "sidebar.inspector.settings": "settings",
  "sidebar.admin.dashboard": "dashboard",
  "sidebar.admin.products": "inventory_2",
  "sidebar.admin.users": "group",
  "sidebar.admin.facilities": "warehouse",
  "sidebar.admin.auditLedger": "policy",
  "sidebar.admin.internalExplorer": "travel_explore",
};

// ─── CTA config per role ──────────────────────────────────────────────────
const roleCTA = {
  FARMER:    { label: "Tạo lô mới", icon: "add", to: "/farmer/batches/new" },
  INSPECTOR: { label: "Kiểm định mới", icon: "add_task", to: "/inspector/review" },
  ADMIN:     { label: "Thêm người dùng", icon: "person_add", to: "/admin/users" },
};

const roleMenus = {
  FARMER: [
    { labelKey: "sidebar.farmer.dashboard", to: "/farmer/dashboard", end: true },
    { labelKey: "sidebar.farmer.createFarm", to: "/farmer/farms/new", end: true },
    { labelKey: "sidebar.farmer.products", to: "/farmer/products", end: true },
    { labelKey: "sidebar.farmer.batchList", to: "/farmer/batches", end: true },
    { labelKey: "sidebar.farmer.createBatch", to: "/farmer/batches/new", end: true },
    { labelKey: "sidebar.farmer.internalExplorer", to: "/internal/trace", end: true },
    { labelKey: "sidebar.farmer.settings", to: "/farmer/settings", end: true },
  ],
  INSPECTOR: [
    { labelKey: "sidebar.inspector.dashboard", to: "/inspector/dashboard", end: true },
    { labelKey: "sidebar.inspector.reviewQueue", to: "/inspector/review", end: true },
    { labelKey: "sidebar.inspector.internalExplorer", to: "/internal/trace", end: true },
    { labelKey: "sidebar.inspector.settings", to: "/inspector/settings", end: true },
  ],
  ADMIN: [
    { labelKey: "sidebar.admin.dashboard", to: "/admin/dashboard", end: true },
    { labelKey: "sidebar.admin.products", to: "/admin/products", end: true },
    { labelKey: "sidebar.admin.users", to: "/admin/users", end: true },
    { labelKey: "sidebar.admin.facilities", to: "/admin/facilities", end: true },
    { labelKey: "sidebar.admin.auditLedger", to: "/admin/audit", end: true },
    { labelKey: "sidebar.admin.internalExplorer", to: "/internal/trace", end: true },
  ],
};

export function Sidebar({ role = "FARMER", isMobileMenuOpen, onClose }) {
  const items = roleMenus[role] ?? [];
  const cta = roleCTA[role];
  const { t } = useTranslation();
  const location = useLocation();

  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobileMenuOpen && onClose) {
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <aside 
      className={`fixed md:sticky top-0 left-0 z-50 w-64 shrink-0 bg-slate-50 flex flex-col h-screen transition-transform duration-300 ease-in-out md:translate-x-0 ${
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full p-4 gap-2">

        {/* Brand Header */}
        <div className="flex items-center gap-3 px-4 py-6 mb-2">
          <div className="w-10 h-10 rounded-xl btn-primary-gradient flex items-center justify-center text-white font-headline font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>spa</span>
          </div>
          <div>
            <h1 className="text-lg font-bold font-headline text-emerald-900 tracking-tight">AgriTrace</h1>
            <p className="text-xs text-slate-500 font-medium">{t("layout.brandSubtitle")}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out",
                  isActive
                    ? "bg-white shadow-sm text-emerald-700 font-bold"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {iconMap[item.labelKey] ?? "circle"}
                  </span>
                  <span>{t(item.labelKey)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* CTA button */}
        {cta && (
          <div className="mt-auto pb-2">
            <Link to={cta.to}>
              <button className="w-full btn-primary-gradient text-white rounded-xl px-4 py-3 font-bold text-sm shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">{cta.icon}</span>
                {cta.label}
              </button>
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
