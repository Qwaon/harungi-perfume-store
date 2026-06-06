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
