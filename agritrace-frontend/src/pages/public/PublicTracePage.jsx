import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { Badge } from "../../components/ui/Badge";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { MapTracking } from "../../components/map/MapTracking";
import { publicClient, unwrapApiResponse } from "../../services/apiClient";

const STAGE_ORDER = [
  "Cultivation",
  "Harvest",
  "Quality Control",
  "Processing",
  "Distribution",
  "Other",
];

const ACTION_TO_STAGE = {
  PLANTING: "Cultivation",
  FERTILIZING: "Cultivation",
  WATERING: "Cultivation",
  SPRAYING: "Cultivation",
  HARVESTING: "Harvest",
  INSPECTION: "Quality Control",
  PACKAGING: "Processing",
  SHIPPING: "Distribution",
};

function mapIntegrityVariant(status) {
  if (status === "VERIFIED") {
    return "success";
  }
  if (status === "COMPROMISED") {
    return "danger";
  }
  return "neutral";
}

function hasInspection(logs) {
  return logs.some((item) => item.action === "INSPECTION");
}

function deriveTrustStatus(logs) {
  if (!logs.length) {
    return "NO_DATA";
  }

  if (logs.some((item) => item.integrityStatus === "COMPROMISED")) {
    return "COMPROMISED";
  }

  if (!hasInspection(logs)) {
    return "AWAITING_INSPECTION";
  }

  return "VERIFIED";
}

function mapTrustVariant(status) {
  if (status === "VERIFIED") {
    return "success";
  }
  if (status === "COMPROMISED") {
    return "danger";
  }
  if (status === "AWAITING_INSPECTION") {
    return "warning";
  }
  return "neutral";
}

function getTrustCardClass(status) {
  if (status === "VERIFIED") {
    return "border-emerald-300 bg-emerald-50";
  }
  if (status === "COMPROMISED") {
    return "border-rose-300 bg-rose-50";
  }
  if (status === "AWAITING_INSPECTION") {
    return "border-amber-300 bg-amber-50";
  }
  return "border-slate-300 bg-slate-50";
}

function getTrustHeadline(status, t) {
  if (status === "VERIFIED") {
    return t("public.verified");
  }
  if (status === "COMPROMISED") {
    return t("public.compromised");
  }
  if (status === "AWAITING_INSPECTION") {
    return t("public.awaitingInspection");
  }
  return t("public.noPublicData");
}

function getTrustDescription(status, t) {
  if (status === "VERIFIED") {
    return t("public.verifiedDescription");
  }
  if (status === "COMPROMISED") {
    return t("public.compromisedDescription");
  }
  if (status === "AWAITING_INSPECTION") {
    return t("public.awaitingInspectionDescription");
  }
  return t("public.noPublicDataDescription");
}

function groupLogsByStage(logs) {
  const buckets = {};
  logs.forEach((item) => {
    const stage = ACTION_TO_STAGE[item.action] ?? "Other";
    if (!buckets[stage]) {
      buckets[stage] = [];
    }
    buckets[stage].push(item);
  });

  return STAGE_ORDER.filter((stage) => buckets[stage]?.length).map((stage) => ({
    stage,
    items: buckets[stage],
  }));
}

function TraceTimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function PublicTracePage() {
  const { batchCode } = useParams();
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIntegrityModal, setShowIntegrityModal] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchTrace = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await publicClient.get(`/api/public/trace/${encodeURIComponent(batchCode)}`);
        const payload = unwrapApiResponse(response);
        const nextLogs = Array.isArray(payload) ? payload : [];

        if (active) {
          setLogs(nextLogs);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        const status = err?.response?.status;
        if (status === 404) {
          setError(t("public.invalidQr"));
        } else {
          setError(err?.userMessage ?? t("public.unableLoadTraceData"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchTrace();

    return () => {
      active = false;
    };
  }, [batchCode, t]);

  const overallStatus = useMemo(() => {
    return deriveTrustStatus(logs);
  }, [logs]);

  const groupedLogs = useMemo(() => groupLogsByStage(logs), [logs]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
      <Card
        className={`mb-6 border-2 ${getTrustCardClass(overallStatus)}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("public.trustStatus")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl" data-testid="trust-headline">
            {getTrustHeadline(overallStatus, t)}
          </h2>
          <Badge
            variant={mapTrustVariant(overallStatus)}
            className="px-5 py-2 text-base font-bold tracking-wide"
            data-testid="trust-badge"
          >
            {getTrustHeadline(overallStatus, t)}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-700">{getTrustDescription(overallStatus, t)}</p>
      </Card>

      <div className="mb-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("public.publicTraceabilityReport")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            {t("public.batchCode")} {batchCode}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{t("public.immutableTimeline")}</p>
        </div>
        <div className="justify-self-start md:justify-self-end">
          <div className="flex items-center gap-2">
            <Badge variant={mapIntegrityVariant(overallStatus)} className="px-3 py-1.5 text-sm font-bold">
              {getTrustHeadline(overallStatus, t)}
            </Badge>
            <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setShowIntegrityModal(true)}>
              {t("public.why")}
            </Button>
          </div>
        </div>
      </div>

      <Card className="mb-6 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900">{t("public.integrityBadgeMeaning")}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm font-semibold text-emerald-800">{t("public.verified")}</p>
            <p className="mt-1 text-sm text-emerald-900">{t("public.hashSignaturePass")}</p>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-semibold text-rose-800">{t("public.compromised")}</p>
            <p className="mt-1 text-sm text-rose-900">{t("public.tamperingRisk")}</p>
          </div>
        </div>
      </Card>

      {loading ? <TraceTimelineSkeleton /> : null}

      {!loading && error ? (
        <StateCard
          tone="error"
          title={t("public.unableLoadTraceData")}
          message={error}
          action={{ label: t("public.tryAnotherCode"), to: "/trace-entry", variant: "secondary" }}
        />
      ) : null}

      {!loading && !error && logs.length === 0 ? (
        <StateCard
          tone="neutral"
          title={t("public.noTraceLogs")}
          message={t("public.noTraceLogsDesc")}
          action={{ label: t("public.backToTraceEntry"), to: "/trace-entry", variant: "secondary" }}
        />
      ) : null}

      {!loading && !error && logs.length > 0 && overallStatus === "AWAITING_INSPECTION" ? (
        <StateCard
          tone="warning"
          title={t("public.inspectionGateNotPublished")}
          message={t("public.inspectionGateNotPublishedDesc")}
        />
      ) : null}

      {!loading && !error && logs.length > 0 ? (
        <Card className="mb-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Hành trình GPS</h2>
            <Badge variant="info">{t("public.eventsCount", { count: logs.length })}</Badge>
          </div>
          <MapTracking logs={logs} />
        </Card>
      ) : null}

      {!loading && !error && logs.length > 0 ? (
        <div className="space-y-6">
          {groupedLogs.map((group) => (
            <Card key={group.stage} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{group.stage}</h2>
                <Badge variant="info">{t("public.eventsCount", { count: group.items.length })}</Badge>
              </div>

              <div className="relative pl-6">
                <div className="absolute left-2 top-1 h-[calc(100%-8px)] w-1 rounded-full bg-slate-300" />

                <div className="space-y-4">
                  {group.items.map((item) => (
                    <div key={item.id} className="relative">
                      <div
                        className={`absolute -left-[23px] top-3 h-4 w-4 rounded-full border-2 ${
                          item.integrityStatus === "COMPROMISED"
                            ? "border-rose-500 bg-rose-100"
                            : "border-emerald-600 bg-emerald-100"
                        }`}
                      />

                      <TimelineCard log={item} mode="public" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {showIntegrityModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">{t("public.integrityBadgeMeaning")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("public.howToInterpretTrust")}</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-sm font-semibold text-emerald-800">{t("public.verified")}</p>
                <p className="mt-1 text-sm text-emerald-900">{t("public.hashSignaturePass")}</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="text-sm font-semibold text-rose-800">{t("public.compromised")}</p>
                <p className="mt-1 text-sm text-rose-900">{t("public.tamperingRisk")}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" onClick={() => setShowIntegrityModal(false)}>
                {t("common.close")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
