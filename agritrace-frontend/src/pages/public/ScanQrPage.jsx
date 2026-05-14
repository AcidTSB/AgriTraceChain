import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { QRScanner } from "../../components/ui/QRScanner";

function extractBatchCode(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);
    const traceMatch = url.pathname.match(/\/trace\/([^/]+)/i);
    if (traceMatch?.[1]) {
      return decodeURIComponent(traceMatch[1]);
    }
  } catch {
    return text;
  }

  return text;
}

export function ScanQrPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [batchCode, setBatchCode] = useState("");
  const [opening, setOpening] = useState(false);

  const openTrace = (rawValue) => {
    const code = extractBatchCode(rawValue);
    if (!code) {
      return;
    }
    setOpening(true);
    navigate(`/trace/${encodeURIComponent(code)}`);
  };

  const onManualSubmit = (event) => {
    event.preventDefault();
    const trimmed = batchCode.trim();
    if (!trimmed || opening) {
      return;
    }
    openTrace(trimmed);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <div className="space-y-3 text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">{t("common.scanQr")}</h1>
        <p className="font-body text-on-surface-variant">
          {t("public.scanDesc")}
        </p>
      </div>

      <Card className="mt-8">
        <QRScanner onScanSuccess={openTrace} />
      </Card>

      <Card className="mt-6">
        <form onSubmit={onManualSubmit} className="space-y-4">
          <Input
            id="manual-batch"
            label={t("public.manualBatchCode")}
            placeholder="Example: AT-8842"
            value={batchCode}
            disabled={opening}
            onChange={(event) => setBatchCode(event.target.value)}
          />
          <Button type="submit" disabled={opening}>
            {opening ? t("public.openingTrace") : t("public.openPublicTrace")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
