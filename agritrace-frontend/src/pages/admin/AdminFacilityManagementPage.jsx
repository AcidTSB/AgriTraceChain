import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { farmService } from "../../services/farmService";
import { useToast } from "../../hooks/useToast";

/* ─── Register Facility Modal ────────────────────────────────────────────── */
function RegisterFacilityModal({ onClose, onRegistered }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", location: "", region: "", certCode: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = t("admin.facilityNameRequired");
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        certificateCode: form.certCode.trim(),
      };
      const created = await farmService.createFarm(payload);
      toast.success(t("admin.facilityRegistered"));
      onRegistered(created);
    } catch (err) {
      toast.error(err?.userMessage ?? t("admin.facilityRegistrationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
            <h2 className="font-headline text-lg font-bold text-on-surface">{t("admin.registerFacility")}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
              <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
            </button>
          </div>
          <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {t("admin.facilityName")} *
              </label>
              <input
                className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.name ? "border-red-400" : "border-outline-variant/40"}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ví dụ: Trại chăn nuôi Đà Lạt"
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {t("admin.locationLabel")}
              </label>
              <input
                className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Ví dụ: Đà Lạt, Lâm Đồng"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t("admin.region")}
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="Ví dụ: Tây Nguyên"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {t("admin.certificationCode")}
                </label>
                <input
                  className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.certCode}
                  onChange={(e) => setForm((f) => ({ ...f, certCode: e.target.value }))}
                  placeholder="VietGAP / GlobalGAP"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
            <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:w-auto sm:py-2">
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:py-2"
            >
              {submitting ? t("common.processing") : t("admin.registerFacility")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inferFacilityType(name = "") {
  const normalized = String(name).toUpperCase();
  if (normalized.includes("INSPECT")) return "INSPECTION";
  if (normalized.includes("PROCESS")) return "PROCESSING";
  if (normalized.includes("STORAGE") || normalized.includes("WAREHOUSE")) return "STORAGE";
  return "PRODUCTION";
}

function facilityIcon(type) {
  if (type === "INSPECTION") return "fact_check";
  if (type === "PROCESSING") return "precision_manufacturing";
  if (type === "STORAGE") return "ac_unit";
  return "agriculture";
}

function shortFacilityCode(id, index) {
  const raw = String(id ?? "").trim();
  if (raw.length >= 5) {
    return `F-${raw.slice(0, 4).toUpperCase()}`;
  }
  return `F-${String(index + 1).padStart(3, "0")}`;
}

function displayFacilityName(name = "") {
  return String(name).replace(/^\[MOCK\]\s*/i, "").trim();
}

export function AdminFacilityManagementPage() {
  const PAGE_SIZE = 10;
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  function handleApplyFilter() {
    setAppliedSearch(searchInput.trim());
    setPage(0);
  }

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await farmService.getAllFarmsPage({
          page,
          size: PAGE_SIZE,
          q: appliedSearch,
          sort: "updatedAt,desc",
        });
        if (active) {
          setFacilities(Array.isArray(payload?.content) ? payload.content : []);
          setTotalPages(Number(payload?.totalPages ?? 0));
          setTotalElements(Number(payload?.totalElements ?? 0));
        }
      } catch (err) {
        if (active) {
          setError(err?.userMessage ?? t("admin.cannotLoadFacilities"));
        }
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
  }, [appliedSearch, page, t]);

  const mappedFacilities = useMemo(
    () =>
      facilities.map((facility, index) => {
        const type = inferFacilityType(facility?.name);
        return {
          id: String(facility?.id ?? `facility-${index}`),
          name: displayFacilityName(facility?.name) || `${t("admin.facilities")} ${index + 1}`,
          location: String(facility?.location ?? "").trim(),
          type,
          code: shortFacilityCode(facility?.id, index),
          status: "ACTIVE",
          icon: facilityIcon(type),
        };
      }),
    [facilities, t],
  );

  const activeCount = mappedFacilities.filter((facility) => facility.status === "ACTIVE").length;
  const activePercent = mappedFacilities.length === 0 ? 0 : Math.round((activeCount / mappedFacilities.length) * 100);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">{t("admin.cannotLoadFacilities")}</h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </Card>
    );
  }

  return (
    <>
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl md:text-4xl">
            {t("admin.facilityManagement")}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
            {t("admin.facilityManagementSubtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegister(true)}
          className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          {t("admin.registerFacility")}
        </button>
      </div>

      <div className="grid gap-5 md:gap-6 lg:grid-cols-3">
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          <form
            className="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-3 ghost-border ambient-shadow sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-3"
            onSubmit={(event) => {
              event.preventDefault();
              handleApplyFilter();
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="material-symbols-outlined shrink-0 text-on-surface-variant">search</span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={t("admin.searchFacilities")}
                  className="w-full border-none bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-0"
                />
            </div>
            <div className="hidden h-6 w-px bg-outline-variant/30 sm:block" />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface-variant transition-colors hover:text-primary sm:w-auto sm:bg-transparent sm:p-0"
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              {t("admin.filter")}
            </button>
          </form>

          {mappedFacilities.length === 0 ? (
            <section className="rounded-xl bg-surface-container-lowest p-5 ghost-border ambient-shadow sm:p-6">
              <h2 className="font-headline text-lg font-semibold text-on-surface">{t("admin.noFacilities")}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{t("admin.noFacilitiesMatching")}</p>
            </section>
          ) : (
            mappedFacilities.map((facility) => (
              <article
                key={facility.id}
                className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low/50 ghost-border ambient-shadow sm:p-5"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                      <span className="material-symbols-outlined">{facility.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary-container/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
                          {facility.code}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {facility.status === "ACTIVE" ? t("admin.activeLabel") : t("admin.inactive")}
                        </span>
                      </div>
                      <h2 className="truncate font-headline text-lg font-semibold tracking-tight text-on-surface sm:text-2xl">
                        {facility.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1 text-sm text-on-surface-variant">
                        <span className="material-symbols-outlined shrink-0 text-[16px]">location_on</span>
                        <span className="truncate">{t("admin.locationLabel")}: {facility.location || t("common.unknown")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col md:items-end">
                    <span className="text-sm text-on-surface-variant">{t("admin.type")}</span>
                    <span className="font-headline text-lg font-semibold text-on-surface">{facility.type}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="space-y-5 md:space-y-6">
          <section className="relative h-64 overflow-hidden rounded-xl bg-surface-container-low ghost-border ambient-shadow">
            <img
              alt={t("admin.mapPreviewAlt")}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD4F0VAQ_Fv7z5FeXf1uGFBR_3TAJaW56oRIL53RfKm1ITTWTxy1fBQDbpg7FueooFhGrSmtZHx3ejX2CVGF06bDTbXAXKYZoc4wfXc0D1h3n5A9RshS9l6KLGO-Lpa0wGAmOK0jXRAE2aEGRE3QGjDYZgY-dwJ3VY17rgdy6g8QHrIGXNs0Gx5iCoOK4fNBPZH973jR8WngyR9Sb9UFznmNWrQLuhBZtDf6SWgz2g8oa767_oI36Ax1wDLWi-0KQFB_BHC2PI0ZkVQ"
              className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-multiply"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent" />
            <div className="absolute inset-x-4 bottom-4 rounded-lg bg-surface-container-lowest/80 p-3 backdrop-blur-xl outline outline-1 outline-outline-variant/30">
              <h3 className="font-headline text-sm font-semibold text-on-surface">{t("admin.networkOverview")}</h3>
              <div className="mt-1 flex items-center justify-between text-xs text-on-surface-variant">
                <span>{t("admin.activeNodes", { count: activeCount })}</span>
                <span className="inline-flex items-center gap-1 text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {t("admin.liveSync")}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-5 ghost-border ambient-shadow sm:p-6">
            <h3 className="font-headline text-xl font-bold tracking-tight text-on-surface sm:text-2xl">
              {t("admin.operationalSummary")}
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <span className="text-sm text-on-surface-variant">{t("admin.totalFacilities")}</span>
                <span className="font-headline text-2xl font-bold text-on-surface">{mappedFacilities.length}</span>
              </div>
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                <span className="inline-flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {t("admin.activeStatus")}
                </span>
                <span className="font-headline text-2xl font-bold text-on-surface">{activePercent}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-on-surface-variant">{t("admin.pendingInspections")}</span>
                <span className="font-headline text-2xl font-bold text-on-surface">0</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-on-surface-variant">{totalElements} facilities</span>
        <OffsetPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>

      {showRegister && (
        <RegisterFacilityModal
          onClose={() => setShowRegister(false)}
            onRegistered={(created) => {
              setShowRegister(false);
              if (created && page === 0 && appliedSearch === "") {
                setFacilities((prev) => [created, ...prev].slice(0, PAGE_SIZE));
                setTotalElements((prev) => prev + 1);
              } else {
              setPage(0);
            }
          }}
        />
      )}
    </>
  );
}
