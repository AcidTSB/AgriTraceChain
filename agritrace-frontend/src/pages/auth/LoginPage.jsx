import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../hooks/useAuth";

function routeByRole(role) {
  if (role === "INSPECTOR") {
    return "/inspector/review";
  }
  if (role === "ADMIN") {
    return "/admin/products";
  }
  return "/farmer/dashboard";
}

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { login, user, isAuthenticated } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(routeByRole(user.role), { replace: true });
    }
  }, [isAuthenticated, navigate, user?.role]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const nextUser = await login(form);
      navigate(routeByRole(nextUser.role), { replace: true });
    } catch {
      setError(t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("auth.account")}</p>
        <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">{t("auth.signIn")}</h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">{t("auth.signInDesc")}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          id="email"
          type="text"
          label={t("auth.email")}
          placeholder="you@example.com"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />

        <Input
          id="password"
          type="password"
          label={t("auth.password")}
          placeholder={t("auth.passwordPlaceholder")}
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />

        {error ? <p className="font-body text-sm text-error">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? t("auth.signingIn") : t("auth.signIn")}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link to="/register" className="font-body font-medium text-primary hover:text-surface-tint">
            {t("auth.createAccount")}
          </Link>
          <Link to="/forgot-password" className="font-body font-medium text-on-surface-variant hover:text-on-surface">
            {t("auth.forgotPassword")}
          </Link>
        </div>
      </form>
    </div>
  );
}
