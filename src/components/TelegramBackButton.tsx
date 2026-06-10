// src/components/TelegramBackButton.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTelegram } from '@/contexts/TelegramContext';

/**
 * Нативная кнопка «Назад» Telegram Mini App.
 *
 * Внутри Telegram листать вверх к BottomNav, чтобы вернуться, неудобно —
 * показываем штатную BackButton в шапке Telegram. Клик → router.back()
 * (а с главной — на каталог, т.к. истории может не быть). На главной кнопку
 * прячем. Вне Telegram компонент ничего не делает (BackButton недоступна).
 */
export default function TelegramBackButton() {
  const { isTelegram } = useTelegram();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isTelegram) return;
    const bb = window.Telegram?.WebApp?.BackButton;
    if (!bb) return;

    const isHome = pathname === '/';
    const onClick = () => {
      // history.length>1 → есть куда вернуться; иначе уводим в каталог.
      if (window.history.length > 1) router.back();
      else router.push('/catalog');
    };

    if (isHome) {
      bb.hide();
      return;
    }

    bb.show();
    bb.onClick(onClick);
    return () => {
      bb.offClick(onClick);
      bb.hide();
    };
  }, [isTelegram, pathname, router]);

  return null;
}
