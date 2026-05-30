import { formatBatchStatusLabel } from "../../helpers/displayLabels";

/**
 * Badge — standardized status badge
 * Props:
 *  status: "PENDING_INSPECTION" | "INSPECTED" | "APPROVED" | "REJECTED" |
 *          "HARVESTED" | "ACTIVE" | "COMPLETED" | "SUBMITTED" | string
 */

const STATUS_CONFIG = {
  PENDING_INSPECTION: {
    label: "Chờ kiểm định",
    dot: "bg-tertiary",
    bg: "bg-tertiary-container/20",
    text: "text-on-tertiary-container",
  },
  INSPECTED: {
    label: "Đã kiểm định",
    dot: "bg-primary-container",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
  APPROVED: {
    label: "Đã duyệt",
    dot: "bg-primary-container",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
  REJECTED: {
    label: "Từ chối",
    dot: "bg-error",
    bg: "bg-error-container/30",
    text: "text-on-error-container",
  },
  COMPROMISED: {
    label: "Vi phạm toàn vẹn",
    dot: "bg-error",
    bg: "bg-error-container/30",
    text: "text-on-error-container",
  },
  HARVESTED: {
    label: "Đã thu hoạch",
    dot: "bg-outline",
    bg: "bg-surface-variant/50",
    text: "text-on-surface",
  },
  ACTIVE: {
    label: "Đang hoạt động",
    dot: "bg-primary-container",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
  INACTIVE: {
    label: "Ngừng hoạt động",
    dot: "bg-error",
    bg: "bg-error-container/30",
    text: "text-on-error-container",
  },
  SUSPENDED: {
    label: "Tạm ngừng truy xuất",
    dot: "bg-error",
    bg: "bg-error-container/30",
    text: "text-on-error-container",
  },
  COMPLETED: {
    label: "Hoàn thành",
    dot: "bg-secondary",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
  SUBMITTED: {
    label: "Đã gửi",
    dot: "bg-outline",
    bg: "bg-surface-container-high",
    text: "text-on-surface",
  },
  SHIPPING: {
    label: "Đang vận chuyển",
    dot: "bg-primary-container",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
};

const VARIANT_CONFIG = {
  success: {
    dot: "bg-primary-container",
    bg: "bg-secondary-container/30",
    text: "text-on-secondary-container",
  },
  danger: {
    dot: "bg-error",
    bg: "bg-error-container/30",
    text: "text-on-error-container",
  },
  warning: {
    dot: "bg-tertiary",
    bg: "bg-tertiary-container/20",
    text: "text-on-tertiary-container",
  },
  info: {
    dot: "bg-outline",
    bg: "bg-surface-container-high",
    text: "text-on-surface",
  },
  neutral: {
    dot: "bg-outline",
    bg: "bg-surface-container-high",
    text: "text-on-surface",
  },
  secondary: {
    dot: "bg-outline",
    bg: "bg-surface-container-high",
    text: "text-on-surface",
  },
};

export function Badge({ status = "", variant = "", className = "", children }) {
  const normalizedStatus = status?.toUpperCase?.() || "";
  const normalizedVariant = variant?.toLowerCase?.() || "";
  const variantLabel = typeof children === "string" || typeof children === "number" ? String(children) : "";

  const cfg = STATUS_CONFIG[normalizedStatus]
    ?? (VARIANT_CONFIG[normalizedVariant]
      ? {
          ...VARIANT_CONFIG[normalizedVariant],
          label: variantLabel || "Không rõ",
        }
      : {
          label: normalizedStatus ? formatBatchStatusLabel(normalizedStatus) : variantLabel || "Không rõ",
          dot: "bg-outline",
          bg: "bg-surface-container-high",
          text: "text-on-surface",
        });

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-body text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
