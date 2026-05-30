const ACTION_LABELS = {
  PLANTING: "Gieo hạt / Trồng cây",
  SEEDING: "Gieo hạt / Trồng cây",
  FERTILIZING: "Bón phân",
  WATERING: "Tưới nước",
  SPRAYING: "Phun thuốc",
  PESTICIDE: "Phun thuốc",
  HARVESTING: "Thu hoạch",
  PACKAGING: "Đóng gói",
  SHIPPING: "Vận chuyển",
  TRANSPORTING: "Vận chuyển",
  INSPECTION: "Kiểm định",
};

const STAGE_LABELS = {
  CULTIVATION: "Canh tác",
  HARVEST: "Thu hoạch",
  "QUALITY CONTROL": "Kiểm định chất lượng",
  PROCESSING: "Sơ chế / chế biến",
  DISTRIBUTION: "Phân phối",
  OTHER: "Khác",
};

const INTEGRITY_LABELS = {
  VERIFIED: "Đã xác minh",
  COMPROMISED: "Cảnh báo xâm phạm",
  AWAITING_INSPECTION: "Chờ kiểm định",
  NO_DATA: "Chưa có dữ liệu",
  UNKNOWN: "Không rõ",
  READ_OK: "Đã đọc / Truy xuất hợp lệ",
  READ_COMPROMISE: "Đã đọc cảnh báo xâm phạm",
};

const NOTIFICATION_KIND_LABELS = {
  INSPECTION_RESULT: "Kết quả kiểm định",
  WARNING: "Cảnh báo",
  ALERT: "Cảnh báo",
  ERROR: "Lỗi",
};

const FACILITY_TYPE_LABELS = {
  FARM: "Nông trại",
  WAREHOUSE: "Kho lưu trữ",
  STORAGE: "Kho lưu trữ",
  FACTORY: "Nhà máy",
  DISTRIBUTOR: "Cơ sở phân phối",
  RETAILER: "Điểm bán lẻ",
  PRODUCTION: "Cơ sở sản xuất",
  PROCESSING: "Cơ sở sơ chế/chế biến",
  INSPECTION: "Kiểm định",
};

const ROLE_LABELS = {
  FARMER: "Nông dân",
  INSPECTOR: "Kiểm định viên",
  ADMIN: "Quản trị viên",
  SYSTEM: "Hệ thống",
};

const UNIT_LABELS = {
  KG: "Kilogram",
  G: "Gram",
  TON: "Tấn",
  T: "Tấn",
  TAN: "Tấn",
  "TẤN": "Tấn",
  L: "Lít",
  LIT: "Lít",
  LITER: "Lít",
  LITRE: "Lít",
  CHAI: "Chai",
  THUNG: "Thùng",
  BAO: "Bao",
  HOP: "Hộp",
  "KG/L": "Kilogram / Lít",
};

function normalizeKey(value) {
  return String(value ?? "").trim();
}

function titleCaseWords(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatLabel(value, labels, fallback = "Không rõ") {
  const raw = normalizeKey(value);
  if (!raw) {
    return fallback;
  }

  const normalized = raw.toUpperCase();
  return labels[normalized] ?? labels[raw] ?? titleCaseWords(raw.replace(/[_-]+/g, " "));
}

export function formatTraceActionLabel(value) {
  return formatLabel(value, ACTION_LABELS);
}

export function formatTraceStageLabel(value) {
  return formatLabel(value, STAGE_LABELS);
}

export function formatIntegrityLabel(value) {
  return formatLabel(value, INTEGRITY_LABELS);
}

export function formatNotificationKindLabel(value) {
  return formatLabel(value, NOTIFICATION_KIND_LABELS, "Thông báo");
}

export function formatFacilityTypeLabel(value) {
  return formatLabel(value, FACILITY_TYPE_LABELS);
}

export function formatRoleLabel(value) {
  return formatLabel(value, ROLE_LABELS, "Người dùng");
}

export function formatUnitLabel(value) {
  return formatLabel(value, UNIT_LABELS, "Đơn vị");
}

export function formatBatchStatusLabel(value) {
  return formatLabel(value, {
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Ngừng hoạt động",
    PENDING_INSPECTION: "Chờ kiểm định",
    INSPECTED: "Đã kiểm định",
    APPROVED: "Đã duyệt",
    REJECTED: "Từ chối",
    COMPROMISED: "Vi phạm toàn vẹn",
    HARVESTED: "Đã thu hoạch",
    SHIPPING: "Đang vận chuyển",
    COMPLETED: "Hoàn thành",
    SUBMITTED: "Đã gửi",
  });
}