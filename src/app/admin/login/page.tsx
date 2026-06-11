'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) { router.push('/admin'); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Ошибка входа'); }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream-100 px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-cream-50 rounded-2xl p-6 border border-cream-200 shadow-lg shadow-ink-900/5">
        <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Вход в админку</h1>
        <div className="relative mb-4">
          <LockClosedIcon className="w-4 h-4 text-ink-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input type={showPassword ? 'text' : 'password'} autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль" className="input-base pl-9 pr-9" />
          <button type="button" onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-900">
            {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-ink-500 mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
