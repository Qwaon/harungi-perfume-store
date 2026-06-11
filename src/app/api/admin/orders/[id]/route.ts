// src/app/api/admin/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import { patchOrder } from '@/lib/admin/supabase-server';

const STATUSES = ['new', 'accepted', 'shipped', 'done', 'canceled'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad id' }, { status: 400 });
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ ok: false, error: 'bad status' }, { status: 400 });
      patch.status = body.status;
    }
    if (body.note !== undefined) patch.note = String(body.note);
    if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: 'nothing to update' }, { status: 400 });
    await patchOrder(id, patch);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
