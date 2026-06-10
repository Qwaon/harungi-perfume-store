// src/app/account/page.tsx
// Серверный компонент: тянет живой каталог (Supabase, ISR) и отдаёт его
// клиентской части. Так FavoritesGrid резолвит избранное по реальным id
// каталога, а не по сид-данным perfumes.json. Гейт isTelegram — внутри клиента.
import type { Perfume } from '@/types';
import { getPerfumes } from '@/data/catalog';
import AccountClient from '@/components/account/AccountClient';

export const revalidate = 60;

export default async function AccountPage() {
  let perfumes: Perfume[];
  try {
    perfumes = await getPerfumes();
  } catch {
    // Каталог недоступен — раздел всё равно работает (избранное просто пусто).
    perfumes = [];
  }
  return <AccountClient perfumes={perfumes} />;
}
