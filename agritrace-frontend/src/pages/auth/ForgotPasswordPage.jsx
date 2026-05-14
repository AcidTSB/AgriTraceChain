import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm font-semibold uppercase tracking-wide text-primary">{t("auth.accountRecovery")}</p>
        <h1 className="mt-2 font-headline text-2xl font-bold tracking-tight text-on-surface">{t("auth.forgotPasswordTitle")}</h1>
        <p className="mt-2 font-body text-sm text-on-surface-variant">
          {t("auth.forgotPasswordDesc")}
        </p>
      </div>

      {submitted ? (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-surface-container-high p-4 font-body text-sm text-on-surface">
          <p className="font-semibold">{t("auth.recoveryReceived")}</p>
          <p className="text-on-surface-variant">{t("auth.recoveryHint")}</p>
          <Link to="/login" className="inline-block">
            <Button variant="secondary">{t("auth.backToLogin")}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <form className="space-y-4" onSubmit={onSubmit}>
            <Input
              id="forgot-email"
              type="email"
              label={t("auth.email")}
              value={email}
              placeholder="you@example.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Button type="submit" className="w-full">{t("auth.sendRecovery")}</Button>
          </form>
          
          <Link to="/login" className="inline-block font-body text-sm font-medium text-primary hover:text-surface-tint">
            {t("auth.backToLogin")}
          </Link>
        </div>
      )}
    </div>
  );
}
