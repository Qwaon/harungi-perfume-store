// src/lib/admin/supabase-server.ts
import 'server-only';

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function assertEnv(): { url: string; key: string } {
  if (!URL || !SERVICE_KEY) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY не заданы');
  return { url: URL, key: SERVICE_KEY };
}

function headers() {
  const { key } = assertEnv();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

// --- Каталог ---

export async function selectPerfumes(): Promise<Record<string, unknown>[]> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/rest/v1/perfumes?select=*&order=brand.asc`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase select perfumes ${res.status}`);
  return res.json();
}

export async function getPerfumeById(id: string): Promise<Record<string, unknown> | null> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: headers(), cache: 'no-store' }
  );
  if (!res.ok) throw new Error(`Supabase get perfume ${res.status}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

export async function upsertPerfume(row: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/rest/v1/perfumes`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(row),
  });
  if (!res.ok) throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
}

export async function patchPerfume(id: string, patch: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }
  );
  if (!res.ok) throw new Error(`Supabase patch perfume ${res.status}`);
}

export async function deletePerfume(id: string): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/perfumes?id=eq.${encodeURIComponent(id)}`,
    { method: 'DELETE', headers: headers() }
  );
  if (!res.ok) throw new Error(`Supabase delete perfume ${res.status}`);
}

// --- Заказы ---

export interface OrderQuery { status?: string; search?: string }

export async function selectOrders(q: OrderQuery = {}): Promise<Record<string, unknown>[]> {
  const { url } = assertEnv();
  const params = new URLSearchParams();
  params.set('select', '*,order_items(*)');
  params.set('order', 'created_at.desc');
  if (q.status) params.set('status', `eq.${q.status}`);
  if (q.search) {
    const s = q.search.trim();
    if (/^\d+$/.test(s)) params.set('order_number', `eq.${s}`);
    else params.set('or', `(customer_name.ilike.*${s}*,contact.ilike.*${s}*)`);
  }
  const res = await fetch(`${url}/rest/v1/orders?${params.toString()}`, {
    headers: headers(), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Supabase select orders ${res.status}`);
  return res.json();
}

export async function patchOrder(id: number, patch: Record<string, unknown>): Promise<void> {
  const { url } = assertEnv();
  const res = await fetch(
    `${url}/rest/v1/orders?id=eq.${id}`,
    { method: 'PATCH', headers: headers(), body: JSON.stringify(patch) }
  );
  if (!res.ok) throw new Error(`Supabase patch order ${res.status}`);
}

export async function countOrdersByStatus(): Promise<Record<string, number>> {
  const rows = await selectOrders();
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r.status);
    counts[s] = (counts[s] || 0) + 1;
  }
  counts.total = rows.length;
  return counts;
}

// --- Storage (фото) ---

export async function uploadImage(bytes: ArrayBuffer, contentType: string, path: string): Promise<string> {
  const { url } = assertEnv();
  const res = await fetch(`${url}/storage/v1/object/perfume-images/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY as string,
      Authorization: `Bearer ${SERVICE_KEY as string}`,
      'Content-Type': contentType || 'image/jpeg',
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Storage upload ${res.status}: ${await res.text()}`);
  return `${url}/storage/v1/object/public/perfume-images/${path}`;
}

export async function deleteImages(prefixes: string[]): Promise<void> {
  if (!prefixes.length) return;
  const { url } = assertEnv();
  await fetch(`${url}/storage/v1/object/perfume-images`, {
    method: 'DELETE', headers: headers(), body: JSON.stringify({ prefixes }),
  }).catch(() => {});
}
