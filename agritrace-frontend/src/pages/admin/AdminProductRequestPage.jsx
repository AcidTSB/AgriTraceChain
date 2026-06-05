import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { productRequestService } from "../../services/productRequestService";
import { useToast } from "../../hooks/useToast";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { OffsetPagination } from "../../components/ui/OffsetPagination";

const STATUS_FILTER_OPTIONS = [
  { value: "ALL",      label: "Tất cả" },
  { value: "PENDING",  label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Từ chối" },
];

const STATUS_CONFIG = {
  PENDING:  { label: "Chờ duyệt",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối",    cls: "bg-red-100 text-red-700 border-red-200" },
};

/* ─── Modal backdrop ───────────────────────────────────────────────────────── */
function ModalShell({ children }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-slate-900/50 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Reject Modal ─────────────────────────────────────────────────────────── */
function RejectModal({ request, onClose, onRejected }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitting(true);
    try {
      await productRequestService.rejectRequest(request.id, reason.trim() || null);
      toast.success(`Đã từ chối yêu cầu "${request.productName}"`);
      onRejected(request.id);
    } catch (err) {
      toast.error(err?.userMessage ?? "Không thể từ chối yêu cầu.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Từ chối yêu cầu</h2>
            <p className="mt-0.5 max-w-sm truncate text-xs text-on-surface-variant">
              {request.productName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
          </button>
        </div>

        <div className="px-5 py-5">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Lý do từ chối <span className="normal-case font-normal">(tùy chọn)</span>
          </label>
          <textarea
            id="reject-reason-input"
            className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder='Ví dụ: "Sản phẩm đã tồn tại trong danh mục" hoặc "Thông tin không đầy đủ"'
          />
          <p className="mt-1 text-xs text-on-surface-variant">
            Lý do sẽ được gửi thông báo đến Farmer.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:w-auto"
          >
            Hủy
          </button>
          <button
            id="confirm-reject-btn"
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Đang xử lý..." : "Xác nhận từ chối"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Request Detail Panel ─────────────────────────────────────────────────── */
function RequestDetailPanel({ request, onClose, onApproved, onRejectClick }) {
  const toast = useToast();
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try {
      await productRequestService.approveRequest(request.id);
      toast.success(`✅ Đã duyệt — Sản phẩm "${request.productName}" đã được tạo!`);
      onApproved(request.id);
    } catch (err) {
      toast.error(err?.userMessage ?? "Không thể duyệt yêu cầu.");
    } finally {
      setApproving(false);
    }
  }

  return (
    <ModalShell>
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Chi tiết yêu cầu</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">
              ID: <span className="font-mono">{String(request.id).slice(0, 8)}…</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
          </button>
        </div>

        <div className="max-h-[calc(100vh-250px)] space-y-4 overflow-y-auto px-5 py-5">
          {/* Fields */}
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Tên sản phẩm" value={request.productName} span="col-span-2" />
            <DetailField label="Danh mục" value={request.category ?? "–"} />
            <DetailField label="Đơn vị" value={request.unit ?? "–"} />
            <DetailField label="Mô tả" value={request.description ?? "–"} span="col-span-2" />
            {request.note && <DetailField label="Ghi chú / Lý do" value={request.note} span="col-span-2" />}
            {request.imageUrl && (
              <div className="col-span-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Ảnh sản phẩm</p>
                <a href={request.imageUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-primary underline break-all">
                  {request.imageUrl}
                </a>
              </div>
            )}
            <DetailField label="Farmer ID" value={String(request.farmerId).slice(0, 8) + "…"} />
            <DetailField label="Ngày gửi" value={new Date(request.createdAt).toLocaleString("vi-VN")} />
          </div>

          {/* Similar products warning */}
          {request.similarProducts && request.similarProducts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                <p className="text-sm font-semibold text-amber-800">Sản phẩm tương tự đã tồn tại</p>
              </div>
              <div className="space-y-1.5">
                {request.similarProducts.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between rounded-lg bg-amber-100/60 px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-amber-900">{sp.name}</p>
                      <p className="text-xs text-amber-700">{sp.category ?? "–"}{sp.sku ? ` · ${sp.sku}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-amber-700">
                Kiểm tra trước khi duyệt để tránh tạo trùng sản phẩm.
              </p>
            </div>
          )}

          {/* Rejection reason (if already rejected) */}
          {request.status === "REJECTED" && request.rejectionReason && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-semibold text-red-700 mb-1">Lý do từ chối</p>
              <p className="text-sm text-red-800">{request.rejectionReason}</p>
            </div>
          )}
        </div>

        {request.status === "PENDING" && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => onRejectClick(request)}
              className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 sm:w-auto"
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">close</span>
              Từ chối
            </button>
            <button
              id="approve-request-btn"
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
            >
              {approving ? "Đang duyệt..." : (
                <>
                  <span className="material-symbols-outlined text-[16px] align-middle mr-1">check_circle</span>
                  Duyệt & Tạo sản phẩm
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function DetailField({ label, value, span = "" }) {
  return (
    <div className={span}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="text-sm text-on-surface break-words">{value}</p>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export function AdminProductRequestPage() {
  const PAGE_SIZE = 15;
  const toast = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [detailTarget, setDetailTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = async (targetPage = page, targetStatus = statusFilter) => {
    setLoading(true);
    try {
      const data = await productRequestService.getAllRequests({
        page: targetPage,
        size: PAGE_SIZE,
        status: targetStatus,
      });
      setRequests(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(Number(data?.totalPages ?? 0));
      setTotalElements(Number(data?.totalElements ?? 0));
    } catch (err) {
      toast.error(err?.userMessage ?? "Không thể tải danh sách yêu cầu.");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    load(page, statusFilter);
  }, [page, statusFilter]);

  function handleApproved(id) {
    setDetailTarget(null);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "APPROVED" } : r));
    setTotalElements((prev) => Math.max(0, prev - 1));
  }

  function handleRejected(id) {
    setRejectTarget(null);
    setDetailTarget(null);
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "REJECTED" } : r));
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  if (loading && initialLoad) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
              Duyệt sản phẩm mới
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Xem xét và phê duyệt các yêu cầu thêm sản phẩm từ Farmer
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5">
              <span className="material-symbols-outlined text-[20px] text-amber-600">pending_actions</span>
              <span className="text-sm font-semibold text-amber-800">
                {pendingCount} yêu cầu chờ duyệt
              </span>
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              id={`filter-${opt.value.toLowerCase()}`}
              type="button"
              onClick={() => { setStatusFilter(opt.value); setPage(0); }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                statusFilter === opt.value
                  ? "btn-primary-gradient text-white shadow-sm"
                  : "border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {requests.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">inbox</span>
              <p className="text-sm text-on-surface-variant">Không có yêu cầu nào trong mục này.</p>
            </div>
          </Card>
        ) : (
          <section className="rounded-xl bg-surface-container-low ambient-shadow overflow-hidden">
            {/* Column headers */}
            <div className="hidden md:grid grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(160px,1.2fr)_100px] gap-4 border-b border-outline-variant/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <div>Sản phẩm đề xuất</div>
              <div>Danh mục / Đơn vị</div>
              <div>Farmer ID</div>
              <div>Ngày gửi</div>
              <div className="text-center">Trạng thái</div>
            </div>

            <div className="flex flex-col divide-y divide-outline-variant/10">
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
                const hasSimilar = req.similarProducts && req.similarProducts.length > 0;

                return (
                  <article
                    key={req.id}
                    className="group cursor-pointer bg-surface-container-lowest px-5 py-4 transition-colors hover:bg-surface-bright"
                    onClick={() => setDetailTarget(req)}
                  >
                    <div className="md:grid grid-cols-[minmax(200px,2fr)_minmax(120px,1fr)_minmax(100px,0.8fr)_minmax(160px,1.2fr)_100px] gap-4 items-center">
                      {/* Product name + similar warning */}
                      <div className="flex items-start gap-2 min-w-0">
                        {hasSimilar && (
                          <span
                            className="mt-0.5 shrink-0 text-amber-500"
                            title="Có sản phẩm tương tự trong danh mục"
                          >
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-on-surface truncate">{req.productName}</p>
                          {req.note && (
                            <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{req.note}</p>
                          )}
                        </div>
                      </div>

                      {/* Category / Unit */}
                      <div className="mt-2 md:mt-0">
                        <p className="text-sm text-on-surface">{req.category ?? "–"}</p>
                        {req.unit && <p className="text-xs text-on-surface-variant">{req.unit}</p>}
                      </div>

                      {/* Farmer ID */}
                      <p className="mt-1 font-mono text-xs text-on-surface-variant md:mt-0">
                        {String(req.farmerId ?? "").slice(0, 8)}…
                      </p>

                      {/* Date */}
                      <p className="mt-1 text-xs text-on-surface-variant md:mt-0">
                        {new Date(req.createdAt).toLocaleString("vi-VN")}
                      </p>

                      {/* Status badge */}
                      <div className="mt-2 md:mt-0 flex items-center md:justify-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                        {req.status === "PENDING" && (
                          <button
                            id={`view-request-${req.id}`}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setDetailTarget(req); }}
                            className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Xem chi tiết"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Pagination */}
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-on-surface-variant">{totalElements} yêu cầu</span>
          <OffsetPagination page={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); load(p, statusFilter); }} />
        </div>
      </div>

      {/* Modals */}
      {detailTarget && !rejectTarget && (
        <RequestDetailPanel
          request={detailTarget}
          onClose={() => setDetailTarget(null)}
          onApproved={handleApproved}
          onRejectClick={(req) => { setRejectTarget(req); }}
        />
      )}

      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={handleRejected}
        />
      )}
    </>
  );
}
