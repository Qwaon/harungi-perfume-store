// src/app/api/admin/catalog/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { selectPerfumes, upsertPerfume } from '@/lib/admin/supabase-server';
import { slugify, makeUniqueId, draftToPerfumeRow, validateField, type PerfumeDraft } from '@/lib/admin/catalog-logic';

export async function GET() {
  try {
    const perfumes = await selectPerfumes();
    return NextResponse.json({ ok: true, perfumes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const draft = (await req.json()) as PerfumeDraft;
    for (const f of ['name', 'brand']) {
      const v = validateField(f, (draft as unknown as Record<string, unknown>)[f]);
      if (!v.ok) return NextResponse.json({ ok: false, error: `${f}: ${v.error}` }, { status: 400 });
    }
    const all = await selectPerfumes();
    const existing = new Set(all.map((p) => String(p.id)));
    const id = makeUniqueId(slugify(draft.brand, draft.name), existing);
    const row = draftToPerfumeRow({ ...draft, id });
    await upsertPerfume(row);
    revalidatePath('/catalog');
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
