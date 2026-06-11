// src/app/api/admin/catalog/[id]/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume, deletePerfume, deleteImages } from '@/lib/admin/supabase-server';
import { draftToPerfumeRow, type PerfumeDraft } from '@/lib/admin/catalog-logic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await getPerfumeById(params.id);
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, perfume: row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const draft = (await req.json()) as PerfumeDraft;
    // id стабилен: не пересоздаём. Берём готовую строку и убираем id из патча.
    const row = draftToPerfumeRow({ ...draft, id: params.id });
    delete (row as Record<string, unknown>).id;
    await patchPerfume(params.id, row);
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deletePerfume(params.id);
    await deleteImages([params.id]); // best-effort: файлы с префиксом id
    revalidatePath('/catalog');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
