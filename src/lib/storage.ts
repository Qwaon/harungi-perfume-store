// src/lib/storage.ts
'use client';

/**
 * Асинхронный адаптер хранилища.
 * Внутри Telegram (клиент >= 6.9) использует CloudStorage, иначе localStorage.
 * Выбор бэкенда — синхронный, по window.Telegram?.WebApp, чтобы не зависеть
 * от готовности React-контекста и не ловить гонки гидратации.
 */

function getCloudStorage() {
  if (typeof window === 'undefined') return null;
  const wa = window.Telegram?.WebApp;
  if (wa && typeof wa.isVersionAtLeast === 'function' && wa.isVersionAtLeast('6.9')) {
    return wa.CloudStorage;
  }
  return null;
}

/**
 * Готовность хранилища: внутри Telegram SDK (telegram-web-app.js) грузится
 * асинхронно, поэтому при первом монтировании контекстов window.Telegram.WebApp
 * ещё может отсутствовать. Если читать в этот момент — бэкенд выберется как
 * localStorage (пусто), а последующая запись уйдёт уже в CloudStorage: чтение и
 * запись расходятся, и сохранённые корзина/избранное «исчезают».
 *
 * `whenStorageReady()` резолвится, когда выбор бэкенда стабилен:
 *  - сразу, если WebApp уже доступен (или мы точно вне Telegram — нет признаков SDK);
 *  - иначе ждём появления window.Telegram.WebApp (poll), но не дольше таймаута,
 *    после чего считаем, что мы вне Telegram (localStorage).
 *
 * Признак «возможно, мы в Telegram, SDK ещё грузится» — наличие тега скрипта
 * telegram-web-app.js в DOM. Вне Telegram такого тега нет → резолвимся сразу.
 */
const READY_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 50;

let readyPromise: Promise<void> | null = null;

function sdkScriptPresent(): boolean {
  if (typeof document === 'undefined') return false;
  return !!document.querySelector('script[src*="telegram-web-app.js"]');
}

export function whenStorageReady(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve) => {
    // WebApp уже готов, либо признаков загрузки SDK нет (обычный браузер) — не ждём.
    if (window.Telegram?.WebApp || !sdkScriptPresent()) {
      resolve();
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.Telegram?.WebApp || Date.now() - started > READY_TIMEOUT_MS) {
        clearInterval(timer);
        resolve();
      }
    }, POLL_INTERVAL_MS);
  });
  return readyPromise;
}

export function storageGet(key: string): Promise<string | null> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.getItem(key, (err, value) => {
        if (err) resolve(null);
        else resolve(value ?? null);
      });
    });
  }
  try {
    return Promise.resolve(localStorage.getItem(key));
  } catch {
    return Promise.resolve(null);
  }
}

export function storageSet(key: string, value: string): Promise<void> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.setItem(key, value, () => resolve());
    });
  }
  try {
    localStorage.setItem(key, value);
  } catch {}
  return Promise.resolve();
}

export function storageRemove(key: string): Promise<void> {
  const cs = getCloudStorage();
  if (cs) {
    return new Promise((resolve) => {
      cs.removeItem(key, () => resolve());
    });
  }
  try {
    localStorage.removeItem(key);
  } catch {}
  return Promise.resolve();
}

/** true, если работаем поверх Telegram CloudStorage (а не localStorage). */
export function isCloudStorage(): boolean {
  return getCloudStorage() !== null;
}
