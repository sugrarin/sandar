"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, X, Mail, ShieldCheck } from "lucide-react";
import { useTranslations } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const t = useTranslations();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("authModal.invalidEmail") || "Введите корректный email");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep("code");
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    setLoading(false);

    if (error) {
      setError(t("authModal.invalidCode"));
    } else {
      onClose();
    }
  };

  return (
    <div
      className="auth-modal__overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="auth-modal__close"
          onClick={onClose}
          aria-label={t("authModal.close")}
        >
          <X aria-hidden="true" />
        </button>

        <div className="auth-modal__icon" aria-hidden="true">
          {step === "email" ? <Mail /> : <ShieldCheck />}
        </div>

        {step === "email" ? (
          <>
            <h2 className="auth-modal__title">{t("authModal.signIn")}</h2>
            <p className="auth-modal__subtitle">{t("authModal.enterEmail")}</p>
            <form className="auth-modal__form" onSubmit={sendCode}>
              <input
                type="email"
                className="auth-modal__input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
              <button
                type="submit"
                className="auth-modal__button"
                disabled={loading || !email.trim()}
              >
                {loading ? t("authModal.sending") : t("authModal.getCode")}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-modal__title">{t("authModal.verifyEmail")}</h2>
            <p className="auth-modal__subtitle">
              {t("authModal.codeSentTo")} <strong>{email}</strong>
            </p>
            <form className="auth-modal__form" onSubmit={verifyCode}>
              <input
                type="text"
                className="auth-modal__input auth-modal__input--code"
                placeholder="••••••"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
              />
              <button
                type="submit"
                className="auth-modal__button"
                disabled={loading || code.length !== 6}
              >
                {loading ? t("authModal.verifying") : t("authModal.login")}
              </button>
              <button
                type="button"
                className="auth-modal__link"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeft aria-hidden="true" />
                {t("authModal.changeEmail")}
              </button>
            </form>
          </>
        )}

        {error && <div className="auth-modal__error">{error}</div>}
      </div>
    </div>
  );
}
