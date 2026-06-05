import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { Badge } from "../../components/ui/Badge";
import { TimelineCard } from "../../components/timeline/TimelineCard";
import { MapTracking } from "../../components/map/MapTracking";
import { batchService } from "../../services/batchService";
import { productService } from "../../services/productService";
import { traceService } from "../../services/traceService";
import { formatTraceStageLabel } from "../../helpers/displayLabels";

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
    label: formatTraceStageLabel(stage),
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

export function AdminTraceDetailPage() {
  const { batchCode } = useParams();
  const { t } = useTranslation();
  const [product, setProduct] = useState(null);
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
        const batchDetail = await batchService.getBatchByCode(batchCode);
        const [traceLogs, productDetail] = await Promise.all([
          traceService.getAdminTraceLogsByBatchCode(batchCode),
          batchDetail?.productId ? productService.getProductById(batchDetail.productId) : Promise.resolve(null),
        ]);

        if (active) {
          setProduct(productDetail);
          setLogs(traceLogs);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.userMessage || "Không thể tải dữ liệu truy xuất nội bộ cho Admin");
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

  const tracePaused = product?.isActive === false;
  const groupedLogs = useMemo(() => groupLogsByStage(logs), [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Báo cáo Truy xuất nguồn gốc dành cho Admin / Kiểm định viên</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Lô hàng: {batchCode}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/dashboard">
            <Button variant="secondary">Quay lại Dashboard</Button>
          </Link>
          <Link to="/admin/audit">
            <Button variant="secondary">Lịch sử Audit</Button>
          </Link>
        </div>
      </div>

      {overallStatus === "COMPROMISED" ? (
        <StateCard
          tone="error"
          title="CẢNH BÁO AN TOÀN DỮ LIỆU (NỘI BỘ)"
          message="CẢNH BÁO: Hệ thống phát hiện dữ liệu truy xuất của lô hàng này bị thay đổi trái phép (mismatch Hash hoặc Signature). Dưới tư cách Admin/Kiểm định viên, vui lòng kiểm tra kỹ chi tiết chữ ký số của từng nhật ký bên dưới."
          className="border-rose-400 bg-rose-50"
        />
      ) : null}

      <Card className={`border-2 ${getTrustCardClass(overallStatus)}`}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Trạng thái tin cậy</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            {getTrustHeadline(overallStatus, t)}
          </h2>
          <Badge variant={mapTrustVariant(overallStatus)} className="px-5 py-2 text-base font-bold tracking-wide">
            {getTrustHeadline(overallStatus, t)}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-700">{getTrustDescription(overallStatus, t)}</p>
      </Card>

      {loading ? <TraceTimelineSkeleton /> : null}

      {!loading && error ? (
        <StateCard
          tone="error"
          title="Lỗi tải dữ liệu"
          message={error}
        />
      ) : null}

      {!loading && !error && logs.length === 0 ? (
        <StateCard
          tone="neutral"
          title="Chưa có nhật ký truy xuất"
          message="Lô hàng này hiện chưa được ghi nhận bất kỳ hoạt động truy xuất nào."
        />
      ) : null}

      {!loading && !error && logs.length > 0 && !tracePaused ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Hành trình GPS</h2>
            <Badge variant="info">Tổng cộng {logs.length} sự kiện</Badge>
          </div>
          <MapTracking logs={logs} />
        </Card>
      ) : null}

      {!loading && !error && logs.length > 0 && !tracePaused ? (
        <div className="space-y-6">
          {groupedLogs.map((group) => (
            <Card key={group.stage} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">{group.label}</h2>
                <Badge variant="info">{group.items.length} sự kiện</Badge>
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
                      <TimelineCard log={item} mode="internal" showMetadata={true} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
