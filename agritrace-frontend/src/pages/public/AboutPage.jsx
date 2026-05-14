import { Card } from "../../components/ui/Card";
import { useTranslation } from "react-i18next";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-10 md:px-6 md:py-14">
      <div>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("common.about")} AgriTrace</p>
        <h1 className="mt-1 font-headline text-3xl font-bold tracking-tight text-on-surface md:text-4xl">
          {t("public.aboutTitle")}
        </h1>
        <p className="mt-3 max-w-3xl font-body text-on-surface-variant">
          {t("public.aboutDesc")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <h2 className="font-headline text-lg font-semibold text-on-surface">{t("public.sourceTransparency")}</h2>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            {t("public.sourceTransparencyDesc")}
          </p>
        </Card>
        <Card>
          <h2 className="font-headline text-lg font-semibold text-on-surface">{t("public.inspectorGate")}</h2>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            {t("public.inspectorGateDesc")}
          </p>
        </Card>
        <Card>
          <h2 className="font-headline text-lg font-semibold text-on-surface">{t("public.publicVerification")}</h2>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            {t("public.publicVerificationDesc")}
          </p>
        </Card>
      </div>
    </div>
  );
}
