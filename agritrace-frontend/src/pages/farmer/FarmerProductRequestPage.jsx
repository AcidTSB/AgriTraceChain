import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { productService } from "../../services/productService";
import { productRequestService } from "../../services/productRequestService";
import { useToast } from "../../hooks/useToast";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { OffsetPagination } from "../../components/ui/OffsetPagination";

const CATEGORIES = [
  "Rau củ", "Trái cây", "Ngũ cốc", "Thủy sản", "Cây công nghiệp", "Gia súc / Gia cầm",
];
const UNITS = ["kg", "tấn", "hộp", "thùng", "túi", "lít", "tạ", "bao"];
const productGlyphs = ["nutrition", "local_florist", "grain", "eco", "spa", "agriculture"];

const STATUS_CONFIG = {
  PENDING:  { label: "Chờ duyệt",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED: { label: "Đã duyệt",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Từ chối",     cls: "bg-red-100 text-red-700 border-red-200" },
};

function displayProductName(name = "") {
  return String(name).replace(/^\[MOCK\]\s*/i, "").replace(/\s+Safe$/i, "").trim();
}

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

/* ─── Submit Request Modal ─────────────────────────────────────────────────── */
function SubmitRequestModal({ onClose, onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState({
    productName: "", category: "", description: "",
    unit: "", imageUrl: "", note: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e = {};
    if (!form.productName.trim()) e.productName = "Tên sản phẩm không được để trống";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const result = await productRequestService.submitRequest({
        productName: form.productName.trim(),
        category: form.category || null,
        description: form.description.trim() || null,
        unit: form.unit || null,
        imageUrl: form.imageUrl.trim() || null,
        note: form.note.trim() || null,
      });
      toast.success("Yêu cầu đã được gửi! Admin sẽ xem xét trong thời gian sớm nhất.");
      onSubmitted(result);
    } catch (err) {
      toast.error(err?.userMessage ?? "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Yêu cầu thêm sản phẩm</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">Admin sẽ xem xét và duyệt yêu cầu của bạn</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
          </button>
        </div>

        <div className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-5 py-5">
          {/* Product name */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Tên sản phẩm *
            </label>
            <input
              id="req-product-name"
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary ${errors.productName ? "border-red-400" : "border-outline-variant/40"}`}
              value={form.productName}
              onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
              placeholder="Ví dụ: Xoài cát Hòa Lộc"
            />
            {errors.productName && <p className="mt-1 text-xs text-red-600">{errors.productName}</p>}
          </div>

          {/* Category + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Danh mục
              </label>
              <select
                id="req-category"
                className="w-full rounded-lg border border-outline-variant/40 bg-white px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">-- Chọn --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Đơn vị
              </label>
              <select
                id="req-unit"
                className="w-full rounded-lg border border-outline-variant/40 bg-white px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              >
                <option value="">-- Chọn --</option>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Mô tả
            </label>
            <textarea
              id="req-description"
              className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn về sản phẩm..."
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Ảnh sản phẩm <span className="normal-case font-normal text-on-surface-variant/60">(URL, tùy chọn)</span>
            </label>
            <input
              id="req-image-url"
              className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          {/* Note / reason */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Lý do / Ghi chú
            </label>
            <textarea
              id="req-note"
              className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Tại sao bạn cần sản phẩm này? (tùy chọn)"
            />
          </div>
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
            type="submit"
            id="req-submit-btn"
            disabled={submitting}
            className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Product Catalog Tab ──────────────────────────────────────────────────── */
function ProductCatalogTab({ onRequestClick }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService.getProducts()
      .then((data) => { if (active) setProducts(data); })
      .catch(() => { if (active) setError("Không thể tải danh sách sản phẩm."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return products;
    return products.filter((p) =>
      [p?.name, p?.description, p?.category, p?.sku]
        .some((f) => String(f ?? "").toLowerCase().includes(kw))
    );
  }, [products, search]);

  if (loading) return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );

  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;

  return (
    <div className="space-y-4">
      {/* Search + CTA row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm..."
            className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-2.5 pl-10 pr-4 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          id="farmer-request-product-btn"
          onClick={onRequestClick}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Yêu cầu thêm sản phẩm
        </button>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-on-surface-variant">Không tìm thấy sản phẩm nào.</p>
        </Card>
      ) : (
        <section className="rounded-xl bg-surface-container-low p-2 ambient-shadow">
          <div className="flex flex-col gap-2 p-2">
            {filtered.map((product, index) => {
              const displayName = displayProductName(product?.name);
              const glyph = productGlyphs[index % productGlyphs.length];
              return (
                <article
                  key={product.id}
                  className="relative overflow-hidden rounded-lg bg-surface-container-lowest px-4 py-4 shadow-sm transition-colors hover:bg-surface-bright"
                >
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  <div className="flex items-center gap-4 pl-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container text-primary">
                      <span aria-hidden className="material-symbols-outlined text-[20px]">{glyph}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline text-sm font-semibold text-on-surface">{displayName}</h3>
                      <p className="text-xs text-on-surface-variant">
                        {product.category || "Chưa phân loại"}
                        {product.unit && <span className="ml-2 text-outline">· {product.unit}</span>}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-container/60 bg-secondary-container/50 px-2.5 py-1 text-xs font-medium text-on-secondary-container">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim" />
                      Đang truy xuất
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── My Requests Tab ──────────────────────────────────────────────────────── */
function MyRequestsTab({ onRequestClick, newRequestFlag, onFlagConsumed }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await productRequestService.getMyRequests({ page: targetPage, size: 10 });
      setRequests(Array.isArray(data?.content) ? data.content : []);
      setTotalPages(Number(data?.totalPages ?? 0));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  // Re-fetch when a new request was submitted
  useEffect(() => {
    if (newRequestFlag) {
      load(0);
      onFlagConsumed();
    }
  }, [newRequestFlag]);

  if (loading) return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-on-surface-variant">
          Danh sách yêu cầu thêm sản phẩm của bạn
        </p>
        <button
          type="button"
          onClick={onRequestClick}
          className="inline-flex items-center gap-2 rounded-lg btn-primary-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Gửi yêu cầu mới
        </button>
      </div>

      {requests.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">inbox</span>
            <p className="text-sm text-on-surface-variant">Bạn chưa gửi yêu cầu nào.</p>
            <button
              type="button"
              onClick={onRequestClick}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Gửi yêu cầu đầu tiên
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING;
            return (
              <article
                key={req.id}
                className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-on-surface">{req.productName}</h3>
                    <p className="mt-0.5 text-xs text-on-surface-variant">
                      {req.category && <span>{req.category}</span>}
                      {req.unit && <span className="ml-1">· {req.unit}</span>}
                    </p>
                    {req.note && (
                      <p className="mt-1.5 text-xs text-on-surface-variant/70 line-clamp-2">
                        <span className="font-medium">Ghi chú:</span> {req.note}
                      </p>
                    )}
                    {req.status === "REJECTED" && req.rejectionReason && (
                      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-700">
                          <span className="font-semibold">Lý do từ chối:</span> {req.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-outline">
                  Gửi lúc: {new Date(req.createdAt).toLocaleString("vi-VN")}
                </p>
              </article>
            );
          })}

          <div className="flex justify-end pt-2">
            <OffsetPagination page={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); load(p); }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────────── */
export function FarmerProductRequestPage() {
  const [activeTab, setActiveTab] = useState("catalog");
  const [showModal, setShowModal] = useState(false);
  const [newRequestFlag, setNewRequestFlag] = useState(false);

  function handleSubmitted() {
    setShowModal(false);
    setNewRequestFlag(true);
    setActiveTab("requests");
  }

  const tabs = [
    { id: "catalog",  label: "Danh sách sản phẩm",  icon: "inventory_2" },
    { id: "requests", label: "Yêu cầu của tôi",      icon: "pending_actions" },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
            Sản phẩm
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Xem danh mục sản phẩm và gửi yêu cầu thêm sản phẩm mới
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-surface-container-low p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white shadow-sm text-emerald-700"
                  : "text-on-surface-variant hover:bg-white/50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "catalog" ? (
          <ProductCatalogTab onRequestClick={() => setShowModal(true)} />
        ) : (
          <MyRequestsTab
            onRequestClick={() => setShowModal(true)}
            newRequestFlag={newRequestFlag}
            onFlagConsumed={() => setNewRequestFlag(false)}
          />
        )}
      </div>

      {showModal && (
        <SubmitRequestModal
          onClose={() => setShowModal(false)}
          onSubmitted={handleSubmitted}
        />
      )}
    </>
  );
}
