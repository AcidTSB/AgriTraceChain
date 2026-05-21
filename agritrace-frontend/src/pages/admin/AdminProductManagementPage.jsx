import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { OffsetPagination } from "../../components/ui/OffsetPagination";
import { Skeleton } from "../../components/ui/Skeleton";
import { productService } from "../../services/productService";
import { batchService } from "../../services/batchService";
import { useToast } from "../../hooks/useToast";

const productGlyphs = ["nutrition", "local_florist", "grain", "eco", "spa", "agriculture"];

function displayProductName(name = "") {
  return String(name).replace(/^\[MOCK\]\s*/i, "").replace(/\s+Safe$/i, "").trim();
}

/* ─── Modal backdrop ─────────────────────────────────────────────────────── */
function ModalShell({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 px-4 py-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {children}
      </div>
    </div>
  );
}

/* ─── Add Product Modal ───────────────────────────────────────────────────── */
function AddProductModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", description: "", sku: "", category: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = t("admin.nameRequired");
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const created = await productService.createProduct({
        name: form.name.trim(),
        description: form.description.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
      });
      toast.success(t("admin.productCreated"));
      onCreated(created);
    } catch (err) {
      toast.error(err?.userMessage ?? t("admin.failedCreateProduct"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("admin.addProduct")}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
          </button>
        </div>
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("admin.productName")} *
            </label>
            <input
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary ${errors.name ? "border-red-400" : "border-outline-variant/40"}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ví dụ: Cà phê Arabica"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                SKU <span className="normal-case text-on-surface-variant/60">(Mã sản phẩm)</span>
              </label>
              <input
                className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="VD: AT-TOM-002"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Danh mục
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">-- Chọn danh mục --</option>
                <option value="Rau củ">Rau củ</option>
                <option value="Trái cây">Trái cây</option>
                <option value="Ngũ cốc">Ngũ cốc</option>
                <option value="Thủy sản">Thủy sản</option>
                <option value="Cây công nghiệp">Cây công nghiệp</option>
                <option value="Gia súc / Gia cầm">Gia súc / Gia cầm</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("admin.description")}
            </label>
            <textarea
              className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả ngắn về sản phẩm..."
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:w-auto sm:py-2">
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {submitting ? t("admin.creating") : t("admin.createProduct")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Edit Product Modal ──────────────────────────────────────────────────── */
function EditProductModal({ product, onClose, onUpdated }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({
    name: displayProductName(product.name),
    description: product.description ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!form.name.trim()) { setErrors({ name: t("admin.nameRequired") }); return; }
    setSubmitting(true);
    try {
      const updated = await productService.updateProduct(product.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
      });
      toast.success(t("admin.productUpdated"));
      onUpdated(updated ?? { ...product, name: form.name.trim(), description: form.description.trim() });
    } catch (err) {
      toast.error(err?.userMessage ?? t("admin.failedUpdateProduct"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("admin.editProduct")}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100">
            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
          </button>
        </div>
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("admin.productName")} *
            </label>
            <input
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.name ? "border-red-400" : "border-outline-variant/40"}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                SKU <span className="normal-case text-on-surface-variant/60">(Mã sản phẩm)</span>
              </label>
              <input
                className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="VD: AT-TOM-002"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Danh mục
              </label>
              <select
                className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">-- Chọn danh mục --</option>
                <option value="Rau củ">Rau củ</option>
                <option value="Trái cây">Trái cây</option>
                <option value="Ngũ cốc">Ngũ cốc</option>
                <option value="Thủy sản">Thủy sản</option>
                <option value="Cây công nghiệp">Cây công nghiệp</option>
                <option value="Gia súc / Gia cầm">Gia súc / Gia cầm</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {t("admin.description")}
            </label>
            <textarea
              className="w-full rounded-lg border border-outline-variant/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:w-auto sm:py-2">
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {submitting ? t("common.processing") : t("common.confirm")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ─── Confirm Delete Dialog ───────────────────────────────────────────────── */
function ConfirmDeleteDialog({ product, onClose, onDeleted }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [checking, setChecking] = useState(true);
  const [hasBatches, setHasBatches] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    batchService.getBatchesByProduct(product.id).then((batches) => {
      if (active) {
        setHasBatches(batches.length > 0);
        setChecking(false);
      }
    });
    return () => { active = false; };
  }, [product.id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await productService.deleteProduct(product.id);
      toast.success(t("admin.productDeleted"));
      onDeleted(product.id);
    } catch (err) {
      toast.error(err?.userMessage ?? t("admin.failedDeleteProduct"));
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <span className="material-symbols-outlined text-red-600">delete</span>
        </div>
        <h2 className="font-headline text-lg font-bold text-on-surface">{t("admin.deleteProduct")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          {t("admin.confirmDeleteDesc", { name: displayProductName(product.name) })}
        </p>

        {checking && (
          <div className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            {t("admin.checkingBatches")}
          </div>
        )}

        {!checking && hasBatches && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="flex items-start gap-2 text-sm font-medium text-amber-800">
              <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0">warning</span>
              {t("admin.productHasBatches")}
            </p>
          </div>
        )}

        {!checking && !hasBatches && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4">
            <p className="text-sm text-red-700">{t("admin.confirmDeleteWarning")}</p>
          </div>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
        <button type="button" onClick={onClose} className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 sm:w-auto sm:py-2">
          {t("common.cancel")}
        </button>
        {!checking && !hasBatches && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {deleting ? t("common.processing") : t("admin.deleteProduct")}
          </button>
        )}
        {!checking && hasBatches && (
          <button type="button" onClick={onClose} className="btn-primary-gradient w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-white sm:w-auto sm:py-2">
            {t("common.close")}
          </button>
        )}
      </div>
    </ModalShell>
  );
}

/* ─── Row Dropdown ────────────────────────────────────────────────────────── */
function RowDropdown({ product, onSuspend, onDelete, open, onToggle }) {
  const { t } = useTranslation();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onToggle();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  const isActive = product.isActive !== false;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
        aria-label={t("admin.moreActions")}
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-xl border border-outline-variant/20 bg-white py-1 shadow-xl">
          <button
            type="button"
            onClick={() => { onSuspend(product); onToggle(); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-600">
              {isActive ? "pause_circle" : "play_circle"}
            </span>
            {isActive ? t("admin.suspendTraceability") : t("admin.activateTraceability")}
          </button>
          <div className="my-1 border-t border-outline-variant/20" />
          <button
            type="button"
            onClick={() => { onDelete(product); onToggle(); }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            {t("admin.deleteProduct")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────────────────── */
export function AdminProductManagementPage() {
  const PAGE_SIZE = 10;
  const { t } = useTranslation();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal states
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dropdownOpenId, setDropdownOpenId] = useState(null);

  const load = async (targetPage = page, targetQuery = query) => {
    setLoading(true);
    setError("");
    try {
      const payload = await productService.getProductsPage({
        page: targetPage,
        size: PAGE_SIZE,
        q: targetQuery.trim(),
        sort: "updatedAt,desc",
      });
      setProducts(Array.isArray(payload?.content) ? payload.content : []);
      setTotalPages(Number(payload?.totalPages ?? 0));
      setTotalElements(Number(payload?.totalElements ?? 0));
    } catch (err) {
      setError(err?.userMessage ?? t("admin.cannotLoadProducts"));
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(page, query);
    }, 250);
    return () => clearTimeout(timer);
  }, [page, query]);

  function handleCreated(created) {
    setShowAdd(false);
    if (created && page === 0 && query.trim() === "") {
      setProducts((prev) => [created, ...prev].slice(0, PAGE_SIZE));
      setTotalElements((prev) => prev + 1);
    } else {
      setPage(0);
    }
  }

  function handleUpdated(updated) {
    setEditTarget(null);
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  function handleDeleted(id) {
    setDeleteTarget(null);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTotalElements((prev) => Math.max(0, prev - 1));
  }

  async function handleSuspend(product) {
    const isActive = product.isActive !== false;
    try {
      if (isActive) {
        await productService.deactivateProduct(product.id);
        toast.success(t("admin.productDeactivated"));
        setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: false } : p));
      } else {
        await productService.activateProduct(product.id);
        toast.success(t("admin.productActivated"));
        setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, isActive: true } : p));
      }
    } catch (err) {
      toast.error(err?.userMessage ?? t("admin.failedUpdateProduct"));
    }
  }

  if (loading && initialLoad) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-slate-900">{t("admin.cannotLoadProducts")}</h2>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl md:text-4xl">
              {t("admin.productDirectoryTitle")}
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{t("admin.productDirectorySubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-primary-gradient inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t("admin.addProduct")}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-surface-container-lowest p-2.5 ghost-border ambient-shadow sm:p-3">
          <div className="relative min-w-0 flex-1">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder={t("farmer.search")}
              className="w-full rounded-lg bg-surface-container-low py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-dim"
            aria-label={t("admin.filter")}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
          </button>
        </div>

        {products.length === 0 ? (
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">{t("admin.noProducts")}</h2>
            <p className="mt-2 text-sm text-slate-600">{t("admin.noProductsDesc")}</p>
          </Card>
        ) : (
          <section className="min-h-[460px] rounded-xl bg-surface-container-low p-3 ambient-shadow sm:p-4 md:p-2">
            <div className="hidden md:grid grid-cols-[minmax(240px,1.15fr)_minmax(360px,2fr)_minmax(150px,auto)_72px] gap-5 border-b border-outline-variant/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
              <div>{t("admin.productIdentity")}</div>
              <div>{t("admin.description")}</div>
              <div>{t("admin.status")}</div>
              <div className="text-right">{t("admin.actions")}</div>
            </div>

            <div className="flex flex-col gap-3 p-0 md:gap-3 md:p-2">
              {products.map((product, index) => {
                const subtitle = product.sku ? `SKU: ${product.sku}` : `${t("admin.productId")}: ${String(product.id).slice(0, 8)}`;
                const glyph = productGlyphs[index % productGlyphs.length];
                const isActive = product.isActive !== false;
                const displayName = displayProductName(product.name);
                const descriptionText = product.description || "–";

                return (
                  <article
                    key={product.id}
                    className={`relative rounded-xl bg-surface-container-lowest p-4 shadow-sm transition-colors hover:bg-surface-bright sm:p-4 ${dropdownOpenId?.includes(product.id) ? 'z-20' : 'z-0'}`}
                  >
                    <div className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full ${isActive ? "bg-primary" : "bg-slate-300"}`} />

                    {/* Mobile Layout */}
                    <div className="space-y-3 md:hidden">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container text-primary">
                          <span aria-hidden className="material-symbols-outlined text-[20px]">{glyph}</span>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h2 className="line-clamp-1 font-headline text-sm font-semibold text-on-surface" title={displayName}>
                            {displayName}
                          </h2>
                          <p className="line-clamp-1 text-xs text-on-surface-variant" title={subtitle}>{subtitle}</p>
                        </div>
                      </div>

                      <div className="min-w-0 space-y-3 pl-1.5">
                        <div className="min-w-0">
                          <p className="mb-1 text-xs text-on-surface-variant">{t("admin.description")}</p>
                          <p className="line-clamp-1 max-w-full text-sm leading-6 text-on-surface" title={descriptionText}>
                            {descriptionText}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="mb-1 text-xs text-on-surface-variant">Mã</p>
                          <p className="truncate font-mono text-xs text-on-surface" title={product.sku ?? "–"}>{product.sku ?? "–"}</p>
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center justify-between gap-2 pl-1.5">
                        {isActive ? (
                          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-secondary-container/60 bg-secondary-container/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-secondary-container">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-fixed-dim" />
                            <span className="truncate">{t("admin.traceabilityActive")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                            <span className="truncate">{t("admin.traceabilitySuspended")}</span>
                          </span>
                        )}
                        <div className="flex shrink-0 items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(product)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                            aria-label={t("admin.editProduct")}
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <RowDropdown
                            product={product}
                            open={dropdownOpenId === `mobile-${product.id}`}
                            onToggle={() => setDropdownOpenId((prev) => prev === `mobile-${product.id}` ? null : `mobile-${product.id}`)}
                            onSuspend={handleSuspend}
                            onDelete={setDeleteTarget}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-[minmax(240px,1.15fr)_minmax(360px,2fr)_minmax(150px,auto)_72px] gap-5 items-center px-1">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container text-primary">
                          <span aria-hidden className="material-symbols-outlined text-[20px]">{glyph}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="line-clamp-2 font-headline text-sm font-semibold text-on-surface break-words" title={displayName}>
                            {displayName}
                          </h2>
                          <p className="line-clamp-1 text-xs text-on-surface-variant break-words" title={subtitle}>{subtitle}</p>
                        </div>
                      </div>

                      <div className="min-w-0 pr-2">
                        <p className="line-clamp-2 text-sm leading-6 text-on-surface" title={descriptionText}>
                          {descriptionText}
                        </p>
                      </div>

                      <div className="flex justify-start">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-secondary-container/60 bg-secondary-container/50 px-3 py-1 text-xs font-semibold text-on-secondary-container">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim" />
                            {t("admin.traceabilityActive")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            {t("admin.traceabilitySuspended")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditTarget(product)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
                          aria-label={t("admin.editProduct")}
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <RowDropdown
                          product={product}
                          open={dropdownOpenId === `desktop-${product.id}`}
                          onToggle={() => setDropdownOpenId((prev) => prev === `desktop-${product.id}` ? null : `desktop-${product.id}`)}
                          onSuspend={handleSuspend}
                          onDelete={setDeleteTarget}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-on-surface-variant">{totalElements} products</span>
          <OffsetPagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
      {editTarget && <EditProductModal product={editTarget} onClose={() => setEditTarget(null)} onUpdated={handleUpdated} />}
      {deleteTarget && <ConfirmDeleteDialog product={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={handleDeleted} />}
    </>
  );
}
