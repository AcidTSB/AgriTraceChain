import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { LocationPicker } from "../../components/ui/LocationPicker";
import { useToast } from "../../hooks/useToast";
import { farmService } from "../../services/farmService";

export function FarmerCreateFarmPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  const [form, setForm] = useState({
    name: "",
    location: "",
    description: "",
    latitude: null,
    longitude: null,
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    location: "",
    gps: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    const nextErrors = { name: "", location: "", gps: "" };
    let valid = true;

    if (!form.name.trim()) {
      nextErrors.name = t("farmer.farmNameRequired");
      valid = false;
    } else if (form.name.trim().length < 3) {
      nextErrors.name = t("farmer.farmNameMin");
      valid = false;
    }

    if (form.location && form.location.trim().length > 120) {
      nextErrors.location = t("farmer.locationMax");
      valid = false;
    }

    if (typeof form.latitude !== "number" || typeof form.longitude !== "number") {
      nextErrors.gps = "Vui long lay toa do GPS cho nong trai truoc khi tao.";
      valid = false;
    }

    setFieldErrors(nextErrors);
    return valid;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        location: form.location.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
      };

      if (form.description.trim()) {
        payload.description = form.description.trim();
      }

      await farmService.createFarm(payload);

      success(t("farmer.farmCreated"));
      navigate("/farmer/batches/new", {
        replace: true,
        state: { toast: t("farmer.farmCreated") },
      });
    } catch (err) {
      const message = err?.userMessage ?? t("farmer.failedCreateFarm");
      setError(message);
      showError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">{t("farmer.onboarding")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{t("farmer.createFarm")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("farmer.createFarmDesc")}</p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            id="farm-name"
            label={t("farmer.farmName")}
            placeholder="Example: Dalat Farm"
            value={form.name}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, name: event.target.value }));
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: "" }));
              }
            }}
            error={fieldErrors.name}
            required
          />

          <Input
            id="farm-location"
            label={t("farmer.location")}
            placeholder="Example: Lam Dong"
            value={form.location}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, location: event.target.value }));
              if (fieldErrors.location) {
                setFieldErrors((prev) => ({ ...prev, location: "" }));
              }
            }}
            error={fieldErrors.location}
          />

          <LocationPicker
            onLocationSelected={({ latitude, longitude }) => {
              setForm((prev) => ({ ...prev, latitude, longitude }));
              if (fieldErrors.gps) {
                setFieldErrors((prev) => ({ ...prev, gps: "" }));
              }
            }}
          />
          {fieldErrors.gps ? <p className="text-sm text-rose-600">{fieldErrors.gps}</p> : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="farm-description">
              {t("farmer.descriptionOptional")}
            </label>
            <textarea
              id="farm-description"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors duration-200 ease-in-out placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              placeholder={t("farmer.descriptionPlaceholder")}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-3">
            <Link to="/farmer/dashboard">
              <Button variant="ghost">{t("common.cancel")}</Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("farmer.creating") : t("farmer.createFarm")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
