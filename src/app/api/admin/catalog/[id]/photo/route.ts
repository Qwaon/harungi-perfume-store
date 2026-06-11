// src/app/api/admin/catalog/[id]/photo/route.ts
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume, uploadImage, deleteImages } from '@/lib/admin/supabase-server';

// POST: multipart/form-data с полем "file" → грузит в Storage, дописывает в images CSV.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const row = await getPerfumeById(params.id);
    if (!row) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'no file' }, { status: 400 });

    const existing = typeof row.images === 'string' && row.images
      ? row.images.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const bytes = await file.arrayBuffer();
    const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const path = `${params.id}-${existing.length + 1}.${ext}`;
    const url = await uploadImage(bytes, file.type, path);
    const images = [...existing, url];
    await patchPerfume(params.id, { images: images.join(', ') });
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true, images });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}

// DELETE: очистить все фото товара.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await patchPerfume(params.id, { images: null });
    await deleteImages([params.id]);
    revalidatePath('/catalog');
    revalidatePath(`/product/${params.id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
