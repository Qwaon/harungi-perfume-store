// src/components/account/SupportLinks.tsx
'use client';

import Link from 'next/link';
import { TELEGRAM_URL } from '@/lib/constants';

export default function SupportLinks() {
  const row =
    'flex justify-between items-center px-4 py-3.5 rounded-xl bg-cream-100 text-sm text-ink-900';
  const shadow = { boxShadow: '0px 0px 0px 1px #e8e6dc' } as const;
  return (
    <div className="mb-10">
      <p className="label text-ink-500 mb-3">Поддержка</p>
      <div className="flex flex-col gap-2">
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={row} style={shadow}>
          <span>Связаться с менеджером</span>
          <span className="text-ink-300">→</span>
        </a>
        <Link href="/faq" className={row} style={shadow}>
          <span>Вопросы и ответы</span>
          <span className="text-ink-300">→</span>
        </Link>
        <Link href="/how-it-works" className={row} style={shadow}>
          <span>Как заказать и доставка</span>
          <span className="text-ink-300">→</span>
        </Link>
      </div>
    </div>
  );
}
