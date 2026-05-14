import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";

export function PublicErrorPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const messageMap = {
    invalid_qr: t("public.invalidQr"),
    batch_not_found: t("public.batchNotFound"),
    not_public_ready: t("public.notPublicReady"),
  };

  const reason = searchParams.get("reason") || "batch_not_found";
  const message = messageMap[reason] || t("public.unableOpenTrace");

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 md:px-6">
      <Card className="w-full text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-700">{t("public.publicError")}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{t("public.traceCannotDisplay")}</h1>
        <p className="mt-3 text-slate-600">{message}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link to="/trace-entry">
            <Button>{t("public.tryAnotherCode")}</Button>
          </Link>
          <Link to="/scan-qr">
            <Button variant="secondary">{t("common.scanQr")}</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
