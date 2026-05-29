import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../hooks/useToast";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { StateCard } from "../../components/ui/StateCard";
import { batchService } from "../../services/batchService";
import { farmService } from "../../services/farmService";
import { inspectorQueueService } from "../../services/inspectorQueueService";
import { productService } from "../../services/productService";

export function FarmerCreateBatchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const { t } = useTranslation();

  const [farms, setFarms] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    quantity: "",
    unit: "",
  });

  const [form, setForm] = useState({
    farmId: "",
    productId: "",
    quantity: "",
    unit: "kg",
    harvestDate: "",
  });

  useEffect(() => {
    let active = true;

    const loadOptions = async () => {
      setLoading(true);
      setError("");

      try {
        const [nextFarms, nextProducts] = await Promise.all([
          farmService.getMyFarms(),
          productService.getProducts(),
        ]);

        if (!active) {
          return;
        }

        setFarms(nextFarms);
        setProducts(nextProducts);
        setForm((prev) => ({
          ...prev,
          farmId: prev.farmId || nextFarms[0]?.id || "",
          productId: prev.productId || nextProducts[0]?.id || "",
        }));
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err?.userMessage ?? t("farmer.unableLoadFarmProducts"));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      active = false;
    };
  }, [t]);

  useEffect(() => {
    if (location.state?.toast) {
      success(location.state.toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, success]);

  const canSubmit = useMemo(() => {
    return Boolean(form.farmId && form.productId && Number(form.quantity) > 0 && form.unit.trim());
  }, [form.farmId, form.productId, form.quantity, form.unit]);
  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === form.farmId) ?? null,
    [farms, form.farmId],
  );

  const onSubmit = async (event) => {
    event.preventDefault();

    const nextFieldErrors = { quantity: "", unit: "" };
    let hasError = false;

    if (Number(form.quantity) <= 0) {
      nextFieldErrors.quantity = t("farmer.quantityGt0");
      hasError = true;
    }
    
    if (!form.unit.trim()) {
      nextFieldErrors.unit = t("farmer.unitRequired");
      hasError = true;
    }

    if (hasError) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        farmId: form.farmId,
        productId: form.productId,
        quantity: Number(form.quantity),
        unit: form.unit.trim(),
        farmLatitude: selectedFarm?.latitude ?? null,
        farmLongitude: selectedFarm?.longitude ?? null,
      };

      if (form.harvestDate) {
        payload.harvestDate = form.harvestDate;
      }

      const created = await batchService.createBatch(payload);
      inspectorQueueService.addCode(created.batchCode);
      success(t("farmer.batchCreated"));
      navigate(`/farmer/batches/${encodeURIComponent(created.batchCode)}`, {
        replace: true,
      });
    } catch (err) {
      const message = err?.userMessage ?? t("farmer.failedCreateBatch");
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Card className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (error && farms.length === 0) {
    return (
      <StateCard title={t("farmer.cannotInitCreateBatch")} message={error} tone="error" className="max-w-2xl" />
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("farmer.workflow")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{t("farmer.createBatch")}</h1>
      </div>

      {farms.length === 0 ? (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">{t("farmer.createFarmBeforeBatch")}</h2>
          <p className="mt-2 text-slate-600">{t("farmer.batchMustLinkedFarm")}</p>
          <div className="mt-4">
            <Link to="/farmer/farms/new">
              <Button>{t("farmer.createFarm")}</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="farmId">
                {t("farmer.farm")}
              </label>
              <select
                id="farmId"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={form.farmId}
                onChange={(event) => setForm((prev) => ({ ...prev, farmId: event.target.value }))}
              >
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="productId">
                {t("farmer.product")}
              </label>
              <select
                id="productId"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                value={form.productId}
                onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="quantity"
                type="number"
                min="1"
                step="0.1"
                label={t("farmer.initialQuantity")}
                placeholder="500"
                value={form.quantity}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, quantity: event.target.value }));
                  if (fieldErrors.quantity) {
                    setFieldErrors((prev) => ({ ...prev, quantity: "" }));
                  }
                }}
                error={fieldErrors.quantity}
                required
              />

              <Input
                id="unit"
                type="text"
                label={t("farmer.unit")}
                placeholder={t("farmer.unitPlaceholder")}
                value={form.unit}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, unit: event.target.value }));
                  if (fieldErrors.unit) {
                    setFieldErrors((prev) => ({ ...prev, unit: "" }));
                  }
                }}
                error={fieldErrors.unit}
                required
              />
            </div>

            <Input
              id="harvestDate"
              type="date"
              label={t("farmer.harvestDateOptional")}
              value={form.harvestDate}
              onChange={(event) => setForm((prev) => ({ ...prev, harvestDate: event.target.value }))}
            />

            {error ? <p className="text-sm text-rose-600">{error}</p> : null}

            <div className="flex items-center justify-end gap-3">
              <Link to="/farmer/dashboard">
                <Button variant="ghost">{t("common.cancel")}</Button>
              </Link>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? t("farmer.creating") : t("farmer.createBatch")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
