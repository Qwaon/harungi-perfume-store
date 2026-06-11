import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getPerfumeById, patchPerfume } from '@/lib/admin/supabase-server';
import { applyPriceDelta, BULK_PRICE_FIELDS, type BulkPriceField, type BulkPriceMode } from '@/lib/admin/catalog-logic';

interface BulkPriceRequest {
  ids: string[];
  fields: string[];
  mode: BulkPriceMode;
  value: number;
}

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as BulkPriceRequest;
    const { ids, fields, mode, value } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'ids: пустой список' }, { status: 400 });
    }
    if (!Array.isArray(fields) || fields.length === 0 || !fields.every((f) => (BULK_PRICE_FIELDS as readonly string[]).includes(f))) {
      return NextResponse.json({ ok: false, error: 'fields: недопустимые поля' }, { status: 400 });
    }
    if (mode !== 'percent' && mode !== 'fixed') {
      return NextResponse.json({ ok: false, error: 'mode: percent | fixed' }, { status: 400 });
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return NextResponse.json({ ok: false, error: 'value: число' }, { status: 400 });
    }

    let updated = 0;
    for (const id of ids) {
      const row = await getPerfumeById(id);
      if (!row) continue;
      const patch: Record<string, number> = {};
      for (const field of fields as BulkPriceField[]) {
        const current = row[field];
        if (typeof current !== 'number') continue;
        patch[field] = applyPriceDelta(current, mode, value);
      }
      if (Object.keys(patch).length > 0) {
        await patchPerfume(id, patch);
        updated += 1;
      }
    }

    revalidatePath('/catalog');
    return NextResponse.json({ ok: true, updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
