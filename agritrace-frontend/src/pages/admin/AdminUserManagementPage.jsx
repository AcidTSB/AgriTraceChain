import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { userService } from "../../services/userService";

const PAGE_SIZE = 10;

export function AdminUserManagementPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [usersPage, setUsersPage] = useState({ content: [], totalPages: 0, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await userService.getUsersPage({
          page,
          size: PAGE_SIZE,
          q: query.trim(),
          sort: "updatedAt,desc",
        });
        if (!active) return;
        setUsersPage({
          content: Array.isArray(payload?.content) ? payload.content : [],
          totalPages: Number(payload?.totalPages ?? 0),
          totalElements: Number(payload?.totalElements ?? 0),
        });
      } catch (err) {
        if (!active) return;
        setError(err?.userMessage ?? t("admin.cannotLoadUsers"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, query, t]);

  const rows = useMemo(() => usersPage.content ?? [], [usersPage.content]);

  const getStatusLabel = (user) => {
    const status = String(user?.status ?? "").toUpperCase();
    if (status === "LOCKED" || user?.active === false) {
      return "Đã khóa";
    }
    if (status === "PENDING" || status === "PENDING_VERIFICATION") {
      return "Chờ xác minh";
    }
    return "Tài khoản đang kích hoạt";
  };

  const getStatusClassName = (user) => {
    const status = String(user?.status ?? "").toUpperCase();
    if (status === "LOCKED" || user?.active === false) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }
    if (status === "PENDING" || status === "PENDING_VERIFICATION") {
      return "border-amber-200 bg-amber-50 text-amber-800";
    }
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 sm:text-sm">{t("admin.workspace")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("admin.userManagement")}</h1>
      </div>

      <Card className="p-4 md:p-6">
        <Input
          id="user-query"
          label={t("farmer.search")}
          placeholder={t("auth.username")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
      </Card>

      {loading ? (
        <div className="space-y-3 sm:space-y-4">
          <Skeleton className="h-20 w-full sm:h-16" />
          <Skeleton className="h-20 w-full sm:h-16" />
        </div>
      ) : error ? (
        <Card className="p-4 md:p-6">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <Card className="space-y-4 p-4 md:space-y-5 md:p-6">
          <div className="space-y-3 sm:hidden">
            {rows.map((user) => (
              <article key={user.id} className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 ghost-border">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.username}</p>
                    <p className="mt-0.5 truncate text-xs text-on-surface-variant">{user.email || "—"}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(user)}`}>
                    {getStatusLabel(user)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="uppercase tracking-wide text-outline">{t("settings.fullName")}</p>
                    <p className="truncate font-medium text-on-surface">{user.fullName || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="uppercase tracking-wide text-outline">{t("auth.role")}</p>
                    <p className="truncate font-medium text-on-surface">{user.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden w-full overflow-x-auto sm:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2 px-1">{t("auth.username")}</th>
                  <th className="py-2 px-1">{t("settings.fullName")}</th>
                  <th className="py-2 px-1">{t("settings.email")}</th>
                  <th className="py-2 px-1">{t("auth.role")}</th>
                  <th className="py-2 px-1">{t("admin.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100">
                    <td className="py-3 px-1 font-medium text-slate-900">{user.username}</td>
                    <td className="py-3 px-1 text-slate-700">{user.fullName || "—"}</td>
                    <td className="py-3 px-1 text-slate-700">{user.email || "—"}</td>
                    <td className="py-3 px-1 text-slate-700">{user.role}</td>
                    <td className="py-3 px-1">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClassName(user)}`}>
                        {getStatusLabel(user)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-on-surface-variant">{usersPage.totalElements} users</span>
            <OffsetPagination
              page={page}
              totalPages={usersPage.totalPages}
              onPageChange={setPage}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
