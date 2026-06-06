'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { CartItem } from '@/types';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { storageGet, storageSet, isCloudStorage } from '@/lib/storage';

const MAX_QUANTITY = 99;
const CART_KEY = 'cart';
const LEGACY_CART_KEY = 'harungi-cart';
const CART_MIGRATED_FLAG = 'harungi-cart-migrated';

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (perfumeId: string, volume: string) => void;
  updateQuantity: (perfumeId: string, volume: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Validate and migrate items loaded from localStorage: drop malformed entries,
 *  backfill `quantity` for carts saved before quantity support existed. */
function sanitizeStoredItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): CartItem[] => {
    if (
      !entry ||
      typeof entry.perfumeId !== 'string' ||
      typeof entry.volume !== 'string' ||
      typeof entry.price !== 'number' ||
      !Number.isFinite(entry.price)
    ) {
      return [];
    }
    const qty = Number(entry.quantity);
    const quantity = Number.isFinite(qty) && qty >= 1 ? Math.min(Math.floor(qty), MAX_QUANTITY) : 1;
    return [{ ...entry, quantity }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Skip the very first persist: on the initial commit `items` is still the
  // empty default, and writing it would overwrite a returning user's saved cart
  // before the load effect's state update has been applied.
  const skipNextPersist = useRef(true);

  useEffect(() => {
    (async () => {
      try {
        // одноразовая миграция localStorage -> CloudStorage
        if (isCloudStorage() && !localStorage.getItem(CART_MIGRATED_FLAG)) {
          const legacy = localStorage.getItem(LEGACY_CART_KEY);
          const current = await storageGet(CART_KEY);
          if (legacy && !current) await storageSet(CART_KEY, legacy);
          localStorage.setItem(CART_MIGRATED_FLAG, '1');
        }
        const saved = (await storageGet(CART_KEY)) ?? localStorage.getItem(LEGACY_CART_KEY);
        if (saved) setItems(sanitizeStoredItems(JSON.parse(saved)));
      } catch {}
    })();
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    storageSet(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isOpen]);

  const addItem = (item: CartItem) => {
    const addQty = Number.isFinite(item.quantity) && item.quantity >= 1 ? Math.floor(item.quantity) : 1;
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.perfumeId === item.perfumeId && i.volume === item.volume
      );
      if (idx === -1) {
        return [...prev, { ...item, quantity: Math.min(addQty, MAX_QUANTITY) }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: Math.min(next[idx].quantity + addQty, MAX_QUANTITY) };
      return next;
    });
  };

  const removeItem = (perfumeId: string, volume: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.perfumeId === perfumeId && i.volume === volume))
    );
  };

  const updateQuantity = (perfumeId: string, volume: string, quantity: number) => {
    setItems((prev) => {
      if (quantity < 1) {
        return prev.filter((i) => !(i.perfumeId === perfumeId && i.volume === volume));
      }
      const clamped = Math.min(Math.floor(quantity), MAX_QUANTITY);
      return prev.map((i) =>
        i.perfumeId === perfumeId && i.volume === volume ? { ...i, quantity: clamped } : i
      );
    });
  };

  const clearCart = () => setItems([]);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        count,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
