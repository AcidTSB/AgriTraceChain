import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import QRCode from "qrcode";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../hooks/useToast";
import { batchService } from "../../services/batchService";

export function FarmerQrSharePage() {
  const { batchCode } = useParams();
  const { success, error: showError } = useToast();

  const [batch, setBatch] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicLink = useMemo(() => {
    return `${window.location.origin}/trace/${encodeURIComponent(batchCode)}`;
  }, [batchCode]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [batchDetail, nextQr] = await Promise.all([
          batchService.getBatchByCode(batchCode),
          QRCode.toDataURL(publicLink, { width: 320, margin: 2 }),
        ]);

        if (!active) {
          return;
        }

        setBatch(batchDetail);
        setQrDataUrl(nextQr);
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.userMessage ?? "Unable to generate QR share content.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [batchCode, publicLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      success("Public link copied.");
    } catch {
      showError("Copy failed. Please copy manually.");
    }
  };

  const downloadQr = () => {
    if (!qrDataUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `agritrace-${batchCode}.png`;
    anchor.click();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">QR share unavailable</h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Farmer Share</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">QR Access / Share</h1>
          <p className="mt-2 text-sm text-slate-600">Batch {batch?.batchCode || batchCode}</p>
        </div>
        <Badge variant="info">Public-ready link</Badge>
      </div>

      <Card className="space-y-4">
        <p className="text-sm text-slate-600">Public trace link</p>
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 break-all">
          {publicLink}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copyLink}>Copy link</Button>
          <Button variant="secondary" onClick={downloadQr} disabled={!qrDataUrl}>
            Download QR
          </Button>
          <a href={publicLink} target="_blank" rel="noreferrer">
            <Button variant="ghost">Open Public Trace</Button>
          </a>
        </div>
      </Card>

      <Card className="flex justify-center">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR for ${batchCode}`} className="h-72 w-72 rounded-xl border border-slate-200" />
        ) : (
          <p className="text-sm text-slate-500">QR not generated.</p>
        )}
      </Card>

      <div>
        <Link to={`/farmer/batches/${encodeURIComponent(batchCode)}`}>
          <Button variant="secondary">Back to batch detail</Button>
        </Link>
      </div>
    </div>
  );
}
