/**
 * TemporalErrorBanner — displayed when a farmer tries to add a farming action
 * AFTER a HARVESTING log already exists. This is a HARD BLOCK (not a warning):
 * it disables the submit button and clearly explains the violation.
 */
export function TemporalErrorBanner({ violations = [] }) {
  if (violations.length === 0) return null;

  return (
    <div
      role="alert"
      className="overflow-hidden rounded-xl border border-red-300 bg-red-50 shadow-sm"
    >
      {/* Header stripe */}
      <div className="flex items-center gap-2 bg-red-600 px-4 py-2.5">
        <span className="text-base">🚫</span>
        <p className="text-sm font-bold uppercase tracking-wide text-white">
          Vi phạm logic thời gian — Bản ghi bị từ chối
        </p>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm font-semibold text-red-800">
          Không thể thêm hành động này vào timeline:
        </p>

        <ul className="mt-2 space-y-1">
          {violations.map((v, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-red-700">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            Bản ghi này sẽ không thể được ký số (Digital Signature) bởi Inspector
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            Chain Integrity: BLOCKED
          </span>
        </div>

        <p className="mt-3 text-xs text-red-500 leading-relaxed">
          Hệ thống thực thi nghiêm ngặt thứ tự thời gian để bảo toàn tính bất biến của chuỗi cung ứng.
          Vui lòng chọn hành động phù hợp với giai đoạn hiện tại của lô.
        </p>
      </div>
    </div>
  );
}
