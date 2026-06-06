// src/app/account/page.tsx
'use client';

import { useTelegram } from '@/contexts/TelegramContext';
import AccountProfile from '@/components/account/AccountProfile';
import OrderHistory from '@/components/account/OrderHistory';
import FavoritesGrid from '@/components/account/FavoritesGrid';
import SupportLinks from '@/components/account/SupportLinks';
import { TELEGRAM_URL } from '@/lib/constants';

export default function AccountPage() {
  const { isTelegram, user } = useTelegram();

  if (isTelegram === undefined) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="h-16 w-48 rounded-xl bg-cream-200 animate-pulse mb-8" />
        <div className="h-40 rounded-xl bg-cream-200 animate-pulse" />
      </div>
    );
  }

  if (!isTelegram) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-light text-ink-900 mb-3">Аккаунт</h1>
        <p className="text-ink-500 text-sm mb-8">
          Раздел доступен в нашем Telegram-приложении.
        </p>
        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          Открыть в Telegram
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <AccountProfile user={user} />
      <OrderHistory />
      <FavoritesGrid />
      <SupportLinks />
    </div>
  );
}
