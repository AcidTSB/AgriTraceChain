import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { authService } from "../../services/authService";

export function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "FARMER" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await authService.register({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setSuccess(t("auth.accountCreated"));
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 600);
    } catch (err) {
      setError(err?.userMessage ?? t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("auth.register")}</p>
        <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">{t("auth.createAccount")}</h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">{t("auth.registerDesc")}</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          id="register-username"
          label={t("auth.username")}
          value={form.username}
          onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          required
        />

        <Input
          id="register-email"
          label={t("auth.email")}
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />

        <Input
          id="register-password"
          label={t("auth.password")}
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />

        <div className="space-y-2">
          <label htmlFor="register-role" className="font-label text-sm font-medium text-on-surface">
            {t("auth.role")}
          </label>
          <select
            id="register-role"
            className="w-full rounded-md border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 font-body text-sm text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="FARMER">FARMER</option>
            <option value="INSPECTOR">INSPECTOR</option>
          </select>
        </div>

        {success ? <p className="font-body text-sm text-primary">{success}</p> : null}
        {error ? <p className="font-body text-sm text-error">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
        </Button>
      </form>

      <Link to="/login" className="inline-block font-body text-sm font-medium text-primary hover:text-surface-tint">
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}
