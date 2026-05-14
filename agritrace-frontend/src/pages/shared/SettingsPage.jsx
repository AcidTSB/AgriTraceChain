import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { authService } from "../../services/authService";

/* ─── Profile Tab ─────────────────────────────────────────────────────────── */
function ProfileTab({ user }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    fullName: user?.username ?? "",
    email: user?.email ?? "",
    region: user?.region ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authService.getProfile().then((profile) => {
      if (profile) {
        setForm({
          fullName: profile.fullName ?? profile.username ?? user?.username ?? "",
          email: profile.email ?? user?.email ?? "",
          region: profile.region ?? profile.branch ?? "",
        });
      }
    }).catch(() => {/* use cached user data */});
  }, []);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setSubmitting(true);
    try {
      const updated = await authService.updateProfile({
        fullName: form.fullName,
        email: form.email,
        region: form.region,
      });
      if (updated) setUser({ ...user, ...updated });
      toast.success(t("settings.profileUpdated"));
    } catch (err) {
      toast.error(err?.userMessage ?? t("settings.profileUpdateFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabel = user?.role
    ? { FARMER: "Nông dân", INSPECTOR: "Kiểm định viên", ADMIN: "Quản trị viên" }[user.role] ?? user.role
    : "—";

  return (
    <div className="grid grid-cols-12 gap-8 items-start">
      {/* Profile Form */}
      <section className="col-span-12 lg:col-span-7">
        <div className="rounded-xl bg-white p-8 shadow-sm" style={{ outline: "1px solid rgba(187,202,191,0.2)" }}>
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              {t("settings.profileSettings")}
            </h3>
            <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold tracking-wider text-on-secondary-container">
              {roleLabel.toUpperCase()}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  {t("settings.fullName")}
                </label>
                <input
                  className="rounded-lg border-0 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  {t("settings.role")}
                </label>
                <input
                  readOnly
                  className="cursor-not-allowed rounded-lg border-0 bg-surface-dim/30 px-4 py-3 text-sm font-medium text-on-surface-variant"
                  value={roleLabel}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t("settings.email")}
              </label>
              <input
                type="email"
                className="rounded-lg border-0 bg-surface-container-low px-4 py-3 text-sm font-medium text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {t("settings.branchRegion")}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary text-[18px]">
                  location_on
                </span>
                <input
                  className="w-full rounded-lg border-0 bg-surface-container-low pl-10 pr-4 py-3 text-sm font-medium text-on-surface focus:ring-1 focus:ring-primary focus:outline-none"
                  value={form.region}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  placeholder="Ví dụ: Dalat Farm - Central Highlands"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary-gradient rounded-lg px-8 py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                {submitting ? t("common.processing") : t("settings.updateProfile")}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* RSA Key Snapshot */}
      <aside className="col-span-12 lg:col-span-5">
        <div className="relative overflow-hidden rounded-xl bg-emerald-950 p-8 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -left-6 -bottom-6 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl" />
          <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                <span
                  className="material-symbols-outlined text-emerald-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  security
                </span>
              </div>
              <h4 className="font-headline text-xl font-bold">{t("settings.digitalSignature")}</h4>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
                <span className="text-sm font-medium text-emerald-200">{t("settings.keyStatus")}</span>
                <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Active / Provisioned
                </span>
              </div>
              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-emerald-300">
                  RSA-2048 Public Key
                </span>
                <code className="block break-all rounded-lg border border-white/5 bg-black/30 p-3 font-mono text-sm text-emerald-400">
                  0x82...f9a
                </code>
              </div>
              <p className="text-sm italic leading-relaxed text-emerald-100/80">
                {t("settings.rsaKeyNote")}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ─── Security Tab ────────────────────────────────────────────────────────── */
function SecurityTab() {
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!form.current) e.current = t("settings.currentPasswordRequired");
    if (form.next.length < 8) e.next = t("settings.newPasswordMin");
    if (form.next !== form.confirm) e.confirm = t("settings.passwordMismatch");
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await authService.changePassword({ currentPassword: form.current, newPassword: form.next });
      toast.success(t("settings.passwordChanged"));
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err?.userMessage ?? t("settings.passwordChangeFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  function PasswordField({ label, fieldKey, placeholder }) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{label}</label>
        <div className="relative">
          <input
            type={showPw[fieldKey] ? "text" : "password"}
            className={`w-full rounded-lg border-0 bg-white px-4 py-3 pr-10 text-sm font-medium text-on-surface shadow-sm focus:ring-1 focus:ring-primary focus:outline-none ${errors[fieldKey] ? "ring-1 ring-red-400" : ""}`}
            placeholder={placeholder ?? "••••••••"}
            value={form[fieldKey]}
            onChange={(e) => setForm((f) => ({ ...f, [fieldKey]: e.target.value }))}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant"
            onClick={() => setShowPw((s) => ({ ...s, [fieldKey]: !s[fieldKey] }))}
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPw[fieldKey] ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>
        {errors[fieldKey] && <p className="text-xs text-red-600">{errors[fieldKey]}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-l-4 border-primary bg-surface-container-low p-8 shadow-sm">
      <div className="mb-8">
        <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
          {t("settings.securityAuth")}
        </h3>
        <p className="text-on-surface-variant">{t("settings.securityDesc")}</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <PasswordField label={t("settings.currentPassword")} fieldKey="current" />
          <PasswordField label={t("settings.newPassword")} fieldKey="next" />
          <PasswordField label={t("settings.confirmPassword")} fieldKey="confirm" />
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-outline-variant/30 pt-8">
          <p className="max-w-md text-sm text-on-surface-variant">{t("settings.passwordPolicy")}</p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-surface-container-high px-8 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-all disabled:opacity-60"
          >
            {submitting ? t("common.processing") : t("settings.changePassword")}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Main Settings Page ──────────────────────────────────────────────────── */
export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
          {t("settings.title")}
        </h1>
        <p className="mt-1 text-on-surface-variant">{t("settings.subtitle")}</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-end gap-12 border-b border-outline-variant/20">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`pb-4 font-headline text-lg font-bold tracking-tight transition-all px-2 ${
            activeTab === "profile"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-emerald-600"
          }`}
        >
          {t("settings.profileTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("security")}
          className={`pb-4 font-headline text-lg font-bold tracking-tight transition-all px-2 ${
            activeTab === "security"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-slate-500 hover:text-emerald-600"
          }`}
        >
          {t("settings.securityTab")}
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "profile" && <ProfileTab user={user} />}
        {activeTab === "security" && <SecurityTab />}
      </div>
    </div>
  );
}
