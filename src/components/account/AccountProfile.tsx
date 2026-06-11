// src/components/account/AccountProfile.tsx
'use client';

import Image from 'next/image';
import type { TelegramUser } from '@/types/telegram';

export default function AccountProfile({ user }: { user: TelegramUser | null }) {
  const name = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Гость';
  const initial = (user?.first_name?.[0] ?? 'Г').toUpperCase();

  return (
    <div className="flex items-center gap-4 mb-8">
      {user?.photo_url ? (
        <Image
          src={user.photo_url}
          alt={name}
          width={64}
          height={64}
          className="w-16 h-16 rounded-full object-cover shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-full bg-gold-500 text-cream-50 flex items-center justify-center font-display text-2xl">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl font-light text-ink-900 leading-tight break-words">{name}</h1>
        {user?.username && <p className="text-sm text-ink-300 truncate">@{user.username}</p>}
      </div>
    </div>
  );
}
