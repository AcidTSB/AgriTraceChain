import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";

export function AdminHomePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5 md:space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 sm:text-sm">{t("admin.workspace")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("admin.adminControls")}</h1>
      </div>

      <Card className="p-4 md:p-6">
        <p className="text-sm leading-relaxed text-slate-600 md:text-base">
          {t("admin.adminPhase1Desc")}
        </p>
      </Card>
    </div>
  );
}
