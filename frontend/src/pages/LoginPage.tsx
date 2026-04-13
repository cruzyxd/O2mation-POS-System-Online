import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { User as LuUser } from "lucide-react";
import { Field } from "../components/ui/field";
import { PasswordInput } from "../components/ui/password-input";
import { InputGroup } from "../components/ui/input-group";
import { useAuth } from "../store/auth.store";

export function LoginPage() {
  const { signIn, user } = useAuth();
  const { t } = useTranslation(["auth", "layout"]);
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(username, password);
      navigate("/");
    } catch (error) {
      const fallback = t("errors.loginFailed", { ns: "auth" });
      const sourceMessage = error instanceof Error ? error.message : fallback;
      const message = sourceMessage.toLowerCase().includes("invalid")
        ? t("form.invalidCredentials", { ns: "auth" })
        : sourceMessage;
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--fg-default)] placeholder:text-[var(--fg-subtle)] py-3 ps-9 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:border-[var(--color-oxygen-400)] transition-colors";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left Panel — always dark */}
      <div className="relative bg-[var(--color-oxygen-950)] overflow-hidden hidden lg:flex items-center justify-center">
        {/* Glow orbs */}
        <div className="absolute -top-[10%] -start-[10%] w-[40vw] h-[40vw] bg-[var(--color-oxygen-500)] rounded-full blur-[160px] opacity-30" />
        <div className="absolute -bottom-[20%] -end-[10%] w-[35vw] h-[35vw] bg-teal-600 rounded-full blur-[160px] opacity-20" />

        {/* Brand Content */}
        <div className="relative z-10 flex flex-col items-start max-w-lg px-12">
          <div className="flex items-baseline gap-3 mb-4">
            <h1 className="text-5xl font-bold font-[var(--font-heading)] tracking-tight text-white">
              {t("brand.name", { ns: "layout" })}
            </h1>
            <span className="w-2 h-2 bg-[var(--color-oxygen-500)] rounded-full self-center" />
            <h1 className="text-5xl font-normal font-[var(--font-heading)] tracking-tight text-white/60">
              {t("brand.suffix", { ns: "layout" })}
            </h1>
          </div>

          <p className="text-xl text-white/80 mb-12 leading-relaxed">
            {t("hero.description", { ns: "auth" })}
          </p>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 w-full">
            <p className="text-white text-lg italic mb-4">{t("hero.quote", { ns: "auth" })}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-oxygen-500)] rounded-full" />
              <div>
                <p className="text-white font-bold text-sm">{t("hero.quoteAuthor", { ns: "auth" })}</p>
                <p className="text-white/60 text-xs">{t("hero.quoteRole", { ns: "auth" })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — form */}
      <div className="bg-[var(--bg-surface)] flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-baseline gap-2 mb-12 lg:hidden">
            <span className="text-2xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">{t("brand.name", { ns: "layout" })}</span>
            <span className="w-1.5 h-1.5 bg-[var(--color-oxygen-500)] rounded-full self-center" />
            <span className="text-2xl font-normal font-[var(--font-heading)] tracking-tight text-[var(--fg-subtle)]">{t("brand.suffix", { ns: "layout" })}</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">
              {t("form.title", { ns: "auth" })}
            </h2>
            <p className="text-[var(--fg-muted)] mt-2">{t("form.subtitle", { ns: "auth" })}</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <Field label={<span className="text-[var(--fg-muted)] font-medium text-sm">{t("form.username", { ns: "auth" })}</span>}>
              <InputGroup startElement={<LuUser size={16} />}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("form.usernamePlaceholder", { ns: "auth" })}
                  className={inputCls}
                  required
                />
              </InputGroup>
            </Field>

            <Field label={<span className="text-[var(--fg-muted)] font-medium text-sm">{t("form.password", { ns: "auth" })}</span>}>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("form.passwordPlaceholder", { ns: "auth" })}
                className="py-3"
                required
              />
            </Field>

            {formError && (
              <p className="text-red-600 text-sm font-semibold">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-4 w-full py-3 rounded-lg bg-[var(--color-oxygen-500)] text-white font-bold text-sm hover:bg-[var(--color-oxygen-600)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> {t("form.submitting", { ns: "auth" })}</>
                : t("form.submit", { ns: "auth" })
              }
            </button>

            <p className="text-xs text-[var(--fg-muted)] text-center mt-2">
              {t("form.seedUsers", { ns: "auth" })}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
