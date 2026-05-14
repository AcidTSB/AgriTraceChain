import i18n from "i18next";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "vi", short: "VI" },
  { code: "en", short: "EN" },
];

export function LanguageSwitcher({ compact = false }) {
  const { t } = useTranslation();
  const active = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <div className="flex items-center gap-2" aria-label={t("common.language")}>
      {!compact ? <span className="text-xs font-medium text-slate-500">{t("common.language")}</span> : null}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {LANGS.map((item) => {
          const selected = active.startsWith(item.code);
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => i18n.changeLanguage(item.code)}
              className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                selected ? "bg-emerald-700 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-pressed={selected}
            >
              {item.short}
            </button>
          );
        })}
      </div>
    </div>
  );
}
