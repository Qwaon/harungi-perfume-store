// src/components/TelegramShell.tsx
'use client';

import { useEffect } from 'react';
import { useTelegram } from '@/contexts/TelegramContext';

/**
 * Внутри Telegram ставит класс `tg-app` на <html>. Под него globals.css:
 *  1) ограничивает приложение мобильной колонкой по центру (--tg-w);
 *  2) точечно форсит мобильный вид у компонентов, которые иначе уходят в
 *     десктопную вёрстку по md:/lg: (Header-nav, BottomNav, сетки товаров).
 *
 * Это нужно, потому что Telegram Desktop — Chromium на широком окне: viewport
 * media-queries видят реальную ширину окна, и `width=` в <meta viewport>, как и
 * обёртка-контейнер, на десктопе НЕ влияют на брейкпоинты (проверено). Поэтому
 * расхождения правятся CSS-оверрайдами под .tg-app, а не сменой вьюпорта.
 */
export default function TelegramShell() {
  const { isTelegram } = useTelegram();

  useEffect(() => {
    if (isTelegram === undefined) return;
    const root = document.documentElement;
    root.classList.toggle('tg-app', isTelegram);
    return () => root.classList.remove('tg-app');
  }, [isTelegram]);

  return null;
}
