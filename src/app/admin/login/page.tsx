'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      <form onSubmit={submit} className="w-full max-w-sm bg-cream-50 rounded-2xl p-6"
        style={{ boxShadow: '0px 0px 0px 1px #e8e6dc' }}>
        <h1 className="font-display text-2xl font-light text-ink-900 mb-6">Вход в админку</h1>
        <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль" className="input-base mb-4" />
        {error && <p role="alert" className="text-sm text-ink-500 mb-4">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
          {loading ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
