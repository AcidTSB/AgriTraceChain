import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { productService } from "../../services/productService";

const productGlyphs = ["nutrition", "local_florist", "grain", "eco", "spa", "agriculture"];

function displayProductName(name = "") {
  return String(name).replace(/^\[MOCK\]\s*/i, "").replace(/\s+Safe$/i, "").trim();
}

export function FarmerProductListPage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const nextProducts = await productService.getProducts();
        if (active) {
          setProducts(nextProducts);
        }
      } catch (err) {
        if (active) {
          setError(err?.userMessage ?? t("farmerProduct.cannotLoad"));
        }
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
  }, [t]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      const fields = [
        product?.name,
        product?.description,
        product?.category,
        product?.sku,
      ];
      return fields.some((field) => String(field ?? "").toLowerCase().includes(keyword));
    });
  }, [products, search]);

  if (loading) {
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
        <h1 className="text-xl font-semibold text-slate-900">{t("farmerProduct.cannotLoad")}</h1>
        <p className="mt-2 text-sm text-slate-600">{error}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
          {t("farmerProduct.productList")}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("farmerProduct.productDirectorySubtitle")}</p>
      </div>

      <div className="relative w-full max-w-md">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-60">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("farmer.batchCodeOrProduct")}
          className="w-full rounded-lg border border-outline-variant/20 bg-surface-container-lowest py-2.5 pl-12 pr-4 text-sm text-on-surface shadow-sm transition-all placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">{t("farmerProduct.noProducts")}</h2>
          <p className="mt-2 text-sm text-slate-600">{t("farmerProduct.noProductsDesc")}</p>
        </Card>
      ) : (
        <section className="rounded-xl bg-surface-container-low p-2 ambient-shadow min-h-[460px]">
          <div className="hidden grid-cols-[minmax(260px,3fr)_minmax(220px,2fr)_minmax(120px,1.2fr)_minmax(190px,1.7fr)] gap-4 border-b border-outline-variant/30 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-on-surface-variant lg:grid">
            <div>{t("admin.productIdentity")}</div>
            <div>Danh mục / {t("admin.description")}</div>
            <div>{t("admin.skuCode")}</div>
            <div>{t("admin.status")}</div>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {filteredProducts.map((product, index) => {
              const displayName = displayProductName(product?.name);
              const glyph = productGlyphs[index % productGlyphs.length];

              return (
                <article
                  key={product.id}
                  className="relative overflow-hidden rounded-lg bg-surface-container-lowest px-4 py-4 shadow-sm transition-colors hover:bg-surface-bright"
                >
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  <div className="grid gap-3 lg:grid-cols-[minmax(260px,3fr)_minmax(220px,2fr)_minmax(120px,1.2fr)_minmax(190px,1.7fr)] lg:items-center">
                    <div className="flex items-center gap-4 pl-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container text-primary">
                        <span aria-hidden className="material-symbols-outlined text-[20px]">{glyph}</span>
                      </div>
                      <div>
                        <h2 className="font-headline text-base font-semibold text-on-surface">{displayName}</h2>
                        <p className="mt-0.5 text-xs text-on-surface-variant">{product.category || "Chưa phân loại"}</p>
                      </div>
                    </div>

                    <p className="text-sm text-on-surface line-clamp-2">
                      {product.description || "–"}
                    </p>

                    <p className="text-xs font-mono text-on-surface-variant">{product.sku ?? "Chưa cập nhật"}</p>

                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary-container/60 bg-secondary-container/50 px-2.5 py-1 text-xs font-medium text-on-secondary-container">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim" />
                        {t("admin.traceabilityActive")}
                      </span>
                    </div>
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
