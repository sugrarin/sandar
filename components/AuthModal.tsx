"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, X, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
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
      setError("Неверный или устаревший код");
    } else {
      onClose();
    }
  };

  const inputClass =
    "w-full h-12 px-4 border border-[var(--card-border)] rounded-xl text-base bg-[var(--bg)] text-[var(--text)] transition-all focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

  const primaryBtnClass =
    "w-full h-12 inline-flex items-center justify-center gap-2 bg-[var(--accent)] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-[min(92vw,400px)] bg-[var(--card)] backdrop-blur-xl rounded-2xl border border-[var(--card-border)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-xl bg-black/[0.04] hover:bg-black/[0.08] transition-all active:scale-95"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-[var(--text-muted)]" strokeWidth={2.5} />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mb-4">
          {step === "email" ? (
            <Mail className="w-6 h-6" strokeWidth={2} />
          ) : (
            <ShieldCheck className="w-6 h-6" strokeWidth={2} />
          )}
        </div>

        {step === "email" ? (
          <>
            <h2 className="text-2xl font-bold mb-1.5 tracking-tight">
              Вход в аккаунт
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Введите email — пришлём 6-значный код для входа
            </p>
            <form onSubmit={sendCode} className="flex flex-col gap-3">
              <input
                type="email"
                className={inputClass}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
              <button
                type="submit"
                className={primaryBtnClass}
                disabled={loading || !email.trim()}
              >
                {loading ? "Отправка..." : "Получить код"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-1.5 tracking-tight">
              Подтвердите email
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 leading-relaxed">
              Код отправлен на{" "}
              <strong className="text-[var(--text)] font-semibold">
                {email}
              </strong>
            </p>
            <form onSubmit={verifyCode} className="flex flex-col gap-3">
              <input
                type="text"
                className={`${inputClass} text-center text-2xl font-bold tabular-nums tracking-[0.4em] h-14`}
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
                className={primaryBtnClass}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Проверка..." : "Войти"}
              </button>
              <button
                type="button"
                className="h-10 inline-flex items-center justify-center gap-1.5 bg-transparent border-none text-sm text-[var(--text-muted)] cursor-pointer rounded-xl transition-colors hover:text-[var(--text)]"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.25} />
                Изменить email
              </button>
            </form>
          </>
        )}

        {error && (
          <div className="mt-4 p-3 bg-[var(--error-soft)] rounded-xl text-[var(--error)] text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
