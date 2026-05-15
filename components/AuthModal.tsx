"use client";

import { useState } from "react";
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

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[min(90vw,380px)] bg-[var(--card)] rounded-[1.25rem] border border-[var(--card-border)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "email" ? (
          <>
            <h2 className="text-2xl font-semibold mb-1">Вход в аккаунт</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Введите email, чтобы получить код
            </p>
            <form onSubmit={sendCode}>
              <input
                type="email"
                className="w-full py-3.5 px-4 mb-3 border border-[var(--card-border)] rounded-xl text-base bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button
                type="submit"
                className="w-full py-3.5 bg-[var(--text)] text-[var(--bg)] border-none rounded-xl text-[0.9375rem] font-medium cursor-pointer"
                disabled={loading}
              >
                {loading ? "Отправка..." : "Получить код"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-1">Подтвердите email</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Код отправлен на <strong>{email}</strong>
            </p>
            <form onSubmit={verifyCode}>
              <input
                type="text"
                className="w-full py-3.5 px-4 mb-3 border border-[var(--card-border)] rounded-xl text-base bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                autoFocus
                required
              />
              <button
                type="submit"
                className="w-full py-3.5 bg-[var(--text)] text-[var(--bg)] border-none rounded-xl text-[0.9375rem] font-medium cursor-pointer"
                disabled={loading}
              >
                {loading ? "Проверка..." : "Войти"}
              </button>
              <button
                type="button"
                className="mt-3 bg-transparent border-none text-[var(--text-muted)] cursor-pointer"
                onClick={() => setStep("email")}
              >
                Изменить email
              </button>
            </form>
          </>
        )}

        {error && (
          <div className="mt-3 p-3 bg-[var(--error-soft)] rounded-lg text-[var(--error)] text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
