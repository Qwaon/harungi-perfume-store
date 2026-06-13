import { NextResponse } from 'next/server';
import fragranceReference from '@/data/fragrance-reference.json';

type FragranceRef = {
  name: string;
  brand: string;
  gender: string;
  scentType: string | null;
  notesTop: string;
  notesMiddle: string;
  notesBase: string;
};

const REFERENCE = fragranceReference as FragranceRef[];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ ok: true, results: [] });

  const results: FragranceRef[] = [];
  for (const item of REFERENCE) {
    if (item.name.toLowerCase().includes(q) || item.brand.toLowerCase().includes(q)) {
      results.push(item);
      if (results.length >= 10) break;
    }
  }

  return NextResponse.json({ ok: true, results });
}
