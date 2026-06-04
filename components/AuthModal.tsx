'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Введите корректный email');
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep('code');
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });

    setLoading(false);

    if (error) {
      setError('Неверный или устаревший код');
    } else {
      onClose();
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'email' ? (
          <>
            <h2 className="auth-modal__title">Вход в аккаунт</h2>
            <p className="auth-modal__subtitle">Введите email, чтобы получить код</p>
            <form onSubmit={sendCode}>
              <input
                type="email"
                className="auth-modal__input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" className="auth-modal__button" disabled={loading}>
                {loading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="auth-modal__title">Подтвердите email</h2>
            <p className="auth-modal__subtitle">
              Код отправлен на <strong>{email}</strong>
            </p>
            <form onSubmit={verifyCode}>
              <input
                type="text"
                className="auth-modal__input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                autoFocus
                required
              />
              <button type="submit" className="auth-modal__button" disabled={loading}>
                {loading ? 'Проверка...' : 'Войти'}
              </button>
              <button
                type="button"
                style={{ marginTop: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setStep('email')}
              >
                Изменить email
              </button>
            </form>
          </>
        )}

        {error && <div className="auth-modal__error">{error}</div>}
      </div>
    </div>
  );
}
