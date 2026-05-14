import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

export function PublicTraceEntryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [batchCode, setBatchCode] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (event) => {
    event.preventDefault();

    const code = batchCode.trim();
    if (!code) {
      setError(t("public.batchCodeRequired"));
      return;
    }

    setError("");
    navigate(`/trace/${encodeURIComponent(code)}`);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <Card>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("public.traceEntry")}</p>
        <h1 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">{t("public.lookupBatchCode")}</h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          {t("public.traceEntryDesc")}
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Input
            id="public-trace-code"
            label={t("public.batchCode")}
            placeholder="Example: AT-8842"
            value={batchCode}
            error={error}
            onChange={(event) => {
              setBatchCode(event.target.value);
              if (error) {
                setError("");
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit">{t("public.openTraceResult")}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/scan-qr")}>{t("public.scanQrInstead")}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
