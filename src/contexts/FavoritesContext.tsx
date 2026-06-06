// src/contexts/FavoritesContext.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { storageGet, storageSet, isCloudStorage } from '@/lib/storage';

const KEY = 'favorites';
const LEGACY_KEY = 'parfum_favorites';
const MIGRATED_FLAG = 'harungi-fav-migrated';

interface FavoritesContextValue {
  favorites: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
  hydrated: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const skipNextPersist = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        // одноразовая миграция из localStorage в CloudStorage
        if (isCloudStorage() && !localStorage.getItem(MIGRATED_FLAG)) {
          const legacy = localStorage.getItem(LEGACY_KEY);
          const current = await storageGet(KEY);
          if (legacy && !current) await storageSet(KEY, legacy);
          localStorage.setItem(MIGRATED_FLAG, '1');
        }
        const raw = (await storageGet(KEY)) ?? localStorage.getItem(LEGACY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setFavorites(parsed.filter((x) => typeof x === 'string'));
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    storageSet(KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggle = (id: string) =>
    setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const isFavorite = (id: string) => favorites.includes(id);

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite, hydrated }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
