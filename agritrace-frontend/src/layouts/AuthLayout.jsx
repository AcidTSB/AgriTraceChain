import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-container-low px-4 py-12">
      <div className="mb-6 w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-body text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <span>&larr;</span> {t("common.home")}
        </Link>
      </div>
      <div className="w-full max-w-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0px_4px_16px_rgba(17,28,45,0.04)] md:p-8">
        <Outlet />
      </div>
    </div>
  );
}
