// src/components/account/CollapsibleSection.tsx
'use client';

import { useState, type ReactNode } from 'react';

/**
 * Сворачиваемая секция профиля: заголовок-кнопка раскрывает/скрывает контент.
 * Используется для «Избранное» и «История заказов».
 */
export default function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 py-2 text-left"
      >
        <span className="label text-ink-500">
          {title}
          {count != null && count > 0 ? ` · ${count}` : ''}
        </span>
        <svg
          aria-hidden="true"
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`text-ink-300 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
