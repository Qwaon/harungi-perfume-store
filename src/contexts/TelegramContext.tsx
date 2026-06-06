// src/contexts/TelegramContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { TelegramUser } from '@/types/telegram';

interface TelegramContextValue {
  isTelegram: boolean | undefined; // undefined = ещё не определились
  user: TelegramUser | null;
}

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: undefined,
  user: null,
});

/**
 * `sdkReady` инкрементируется родителем после загрузки telegram-web-app.js,
 * чтобы переопределить раннее `isTelegram=false` (когда window.Telegram ещё нет).
 */
export function TelegramContextProvider({
  children,
  sdkReady = 0,
}: {
  children: ReactNode;
  sdkReady?: number;
}) {
  const [isTelegram, setIsTelegram] = useState<boolean | undefined>(undefined);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const wa = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
    const inTelegram = !!wa && typeof wa.initData === 'string' && wa.initData.length > 0;

    // Если SDK ещё не загружен и WebApp недоступен — подождём сигнала sdkReady,
    // не фиксируя преждевременно false.
    if (!wa && sdkReady === 0) return;

    setIsTelegram(inTelegram);
    if (inTelegram && wa) {
      try {
        wa.ready();
        wa.expand();
        // палитра HARUNGI остаётся; красим только шапку под cream-фон
        wa.setHeaderColor('#f5f4ed');
      } catch {}
      setUser(wa.initDataUnsafe?.user ?? null);
    }
  }, [sdkReady]);

  return (
    <TelegramContext.Provider value={{ isTelegram, user }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}
