import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { formatIntegrityLabel, formatTraceActionLabel } from "../../helpers/displayLabels";

function renderValue(value, t) {
  if (value === null || value === undefined || value === "") {
    return t("common.nA");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function InternalTraceDetailPage() {
  const { t } = useTranslation();
  const { traceId } = useParams();
  const location = useLocation();
  const record = location.state?.record;
  const batchCode = location.state?.batchCode;

  if (!record) {
    return (
      <Card>
        <h1 className="text-xl font-semibold text-slate-900">{t("internalTrace.traceDetailUnavailable")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("internalTrace.traceDetailDesc")}
        </p>
        <div className="mt-4">
          <Link to="/internal/trace">
            <Button variant="secondary">{t("internalTrace.backToExplorer")}</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const fields = [
    ["Trace ID", traceId],
    [t("public.batchCode"), batchCode],
    [t("farmer.action"), formatTraceActionLabel(record.action)],
    [t("public.time"), record.timestamp],
    [t("internalTrace.actor"), record.actor || record.actorName || record.createdBy],
    [t("public.location"), record.location],
    [t("public.quantity"), record.quantity],
    [t("internalTrace.integrity"), formatIntegrityLabel(record.integrityStatus)],
    [t("farmer.notes"), record.notes],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("internalTrace.crossRole")}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{t("internalTrace.detailTitle")}</h1>
        </div>
        <Badge variant={record.integrityStatus === "COMPROMISED" ? "danger" : "success"}>
            {formatIntegrityLabel(record.integrityStatus)}
        </Badge>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-sm text-slate-800">{renderValue(value, t)}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("internalTrace.rawPayload")}</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(record, null, 2)}
        </pre>
      </Card>

      <Link to="/internal/trace">
        <Button variant="secondary">{t("internalTrace.backToExplorer")}</Button>
      </Link>
    </div>
  );
}
