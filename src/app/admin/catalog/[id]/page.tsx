import { getPerfumeById } from '@/lib/admin/supabase-server';
import PerfumeForm from '@/components/admin/PerfumeForm';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditPerfumePage({ params }: { params: { id: string } }) {
  const perfume = await getPerfumeById(params.id);
  if (!perfume) notFound();
  return (
    <div>
      <h1 className="font-display text-2xl font-light text-ink-900 mb-4">Правка: {String(perfume.brand)} — {String(perfume.name)}</h1>
      <PerfumeForm initial={perfume} id={params.id} />
    </div>
  );
}
