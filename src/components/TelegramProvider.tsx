// src/components/TelegramProvider.tsx
'use client';

import Script from 'next/script';
import { ReactNode, useEffect, useState } from 'react';
import { TelegramContextProvider } from '@/contexts/TelegramContext';

export default function TelegramProvider({ children }: { children: ReactNode }) {
  // Скрипт SDK грузится асинхронно (afterInteractive). Пока он не загружен,
  // window.Telegram может отсутствовать. После onLoad/onError (или таймаута)
  // инкрементируем sdkReady, чтобы контекст окончательно определил isTelegram.
  const [sdkReady, setSdkReady] = useState(0);
  const bump = () => setSdkReady((k) => k + 1);

  // Страховка: если скрипт вообще не загрузился (сеть/блокировка),
  // через 3s всё равно резолвим контекст (получим isTelegram=false).
  useEffect(() => {
    const t = setTimeout(bump, 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="afterInteractive"
        onLoad={bump}
        onError={bump}
      />
      <TelegramContextProvider sdkReady={sdkReady}>{children}</TelegramContextProvider>
    </>
  );
}
