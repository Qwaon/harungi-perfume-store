'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ENUMS, MULTI_ENUMS } from '@/lib/admin/catalog-logic';

type Suggestion = {
  name: string;
  brand: string;
  gender: string;
  scentType: string | null;
  notesTop: string;
  notesMiddle: string;
  notesBase: string;
};

type Row = Record<string, unknown>;

const TEXT_FIELDS: [string, string][] = [
  ['name', 'Название *'], ['brand', 'Бренд *'], ['description', 'Описание'],
  ['notes_top', 'Верхние ноты'], ['notes_middle', 'Средние ноты'], ['notes_base', 'Базовые ноты'],
];
const NUM_FIELDS: [string, string][] = [
  ['price_5ml', 'Цена 5мл'], ['price_10ml', 'Цена 10мл'], ['price_15ml', 'Цена 15мл'],
  ['price_20ml', 'Цена 20мл'], ['price_original', 'Цена оригинала'], ['original_volume_ml', 'Объём оригинала, мл'],
];
const FLAGS: [string, string][] = [
  ['inStock', 'В наличии'], ['featured', 'Featured'], ['newArrival', 'Новинка'], ['bestseller', 'Хит'],
];
const CSV_FIELDS = new Set(['notes_top', 'notes_middle', 'notes_base']);

export default function PerfumeForm({ initial, id }: { initial?: Row; id?: string }) {
  const router = useRouter();
  const init = initial ?? {};
  const [text, setText] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const [k] of [...TEXT_FIELDS, ...NUM_FIELDS]) o[k] = init[k] != null ? String(init[k]) : '';
    return o;
  });
  const [enums, setEnums] = useState<Record<string, string>>(() => ({
    gender: String(init.gender ?? ''), scentType: String(init.scentType ?? ''), format: String(init.format ?? ''),
  }));
  const [multi, setMulti] = useState<Record<string, string[]>>(() => ({
    season: typeof init.season === 'string' && init.season ? init.season.split(',').map((s: string) => s.trim()) : [],
    occasion: typeof init.occasion === 'string' && init.occasion ? init.occasion.split(',').map((s: string) => s.trim()) : [],
  }));
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const o: Record<string, boolean> = {};
    for (const [k] of FLAGS) o[k] = Boolean(init[k]);
    return o;
  });
  const [images, setImages] = useState<string[]>(
    typeof init.images === 'string' && init.images ? init.images.split(',').map((s: string) => s.trim()) : []
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestField, setSuggestField] = useState<'name' | 'brand' | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = (field: 'name' | 'brand', query: string) => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (id || query.trim().length < 2) { setSuggestions([]); setSuggestField(null); return; }
    suggestTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/admin/catalog/suggest?q=${encodeURIComponent(query.trim())}`);
      const d = await res.json().catch(() => ({}));
      setSuggestions(Array.isArray(d.results) ? d.results : []);
      setSuggestField(field);
    }, 250);
  };

  const applySuggestion = (s: Suggestion) => {
    setText((p) => ({
      ...p,
      name: s.name,
      brand: s.brand,
      notes_top: s.notesTop,
      notes_middle: s.notesMiddle,
      notes_base: s.notesBase,
    }));
    if (s.gender && (ENUMS.gender ?? []).includes(s.gender)) {
      setEnums((p) => ({ ...p, gender: s.gender }));
    }
    if (s.scentType && (ENUMS.scentType ?? []).includes(s.scentType)) {
      setEnums((p) => ({ ...p, scentType: s.scentType as string }));
    }
    setSuggestions([]);
    setSuggestField(null);
  };

  useEffect(() => () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); }, []);

  const toggleMulti = (field: string, val: string) =>
    setMulti((p) => ({ ...p, [field]: p[field].includes(val) ? p[field].filter((x) => x !== val) : [...p[field], val] }));

  const buildDraft = () => {
    const draft: Record<string, unknown> = { ...enums, ...flags };
    for (const [k] of TEXT_FIELDS) {
      draft[k] = CSV_FIELDS.has(k)
        ? (text[k] ? text[k].split(',').map((s) => s.trim()).filter(Boolean) : [])
        : text[k];
    }
    for (const [k] of NUM_FIELDS) draft[k] = text[k] === '' ? undefined : Number(text[k]);
    draft.season = multi.season; draft.occasion = multi.occasion;
    draft.images = images;
    return draft;
  };

  const save = async () => {
    setSaving(true); setError('');
    const draft = buildDraft();
    const url = id ? `/api/admin/catalog/${id}` : '/api/admin/catalog';
    const method = id ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    setSaving(false);
    if (res.ok) { router.push('/admin/catalog'); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error || 'Ошибка сохранения'); }
  };

  const uploadPhoto = async (file: File) => {
    if (!id) { setError('Сначала сохраните товар, затем добавляйте фото.'); return; }
    const fd = new FormData(); fd.set('file', file);
    const res = await fetch(`/api/admin/catalog/${id}/photo`, { method: 'POST', body: fd });
    const d = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(d.images)) setImages(d.images);
    else setError(d.error || 'Ошибка загрузки фото');
  };

  const clearPhotos = async () => {
    if (!id) return;
    await fetch(`/api/admin/catalog/${id}/photo`, { method: 'DELETE' });
    setImages([]);
  };

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      {TEXT_FIELDS.map(([k, label]) => (
        <label key={k} className="block relative">
          <span className="label text-ink-500 block mb-1">{label}</span>
          <input
            value={text[k]}
            onChange={(e) => {
              const v = e.target.value;
              setText((p) => ({ ...p, [k]: v }));
              if (k === 'name' || k === 'brand') fetchSuggestions(k, v);
            }}
            onFocus={() => { if ((k === 'name' || k === 'brand') && text[k].trim().length >= 2) fetchSuggestions(k, text[k]); }}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            className="input-base"
            autoComplete="off"
          />
          {(k === 'name' || k === 'brand') && suggestField === k && suggestions.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 max-h-64 overflow-auto rounded-lg border border-cream-200 bg-cream-50 shadow-lg">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applySuggestion(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-cream-200 flex flex-col"
                  >
                    <span className="text-ink-900">{s.name}</span>
                    <span className="text-xs text-ink-300">{s.brand} · {s.gender}{s.scentType ? ` · ${s.scentType}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      ))}
      <div className="grid grid-cols-2 gap-3">
        {NUM_FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <span className="label text-ink-500 block mb-1">{label}</span>
            <input inputMode="numeric" value={text[k]} onChange={(e) => setText((p) => ({ ...p, [k]: e.target.value }))} className="input-base" />
          </label>
        ))}
      </div>
      {Object.keys(ENUMS).map((field) => (
        <div key={field}>
          <span className="label text-ink-500 block mb-1">{field}</span>
          <div className="flex flex-wrap gap-1.5">
            {ENUMS[field].map((v) => (
              <button key={v} type="button" onClick={() => setEnums((p) => ({ ...p, [field]: v }))}
                className={`text-xs px-3 py-1.5 rounded-full border ${enums[field] === v ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      {Object.keys(MULTI_ENUMS).map((field) => (
        <div key={field}>
          <span className="label text-ink-500 block mb-1">{field} (пусто = авто)</span>
          <div className="flex flex-wrap gap-1.5">
            {MULTI_ENUMS[field].map((v) => (
              <button key={v} type="button" onClick={() => toggleMulti(field, v)}
                className={`text-xs px-3 py-1.5 rounded-full border ${multi[field].includes(v) ? 'bg-gold-500 text-white border-gold-500' : 'border-cream-200 text-ink-500'}`}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        {FLAGS.map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={flags[k]} onChange={(e) => setFlags((p) => ({ ...p, [k]: e.target.checked }))} />
            {label}
          </label>
        ))}
      </div>

      <div>
        <span className="label text-ink-500 block mb-1">Фото ({images.length})</span>
        {!id && <p className="text-xs text-ink-300 mb-2">Доступно после сохранения товара.</p>}
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className="w-16 h-16 object-cover rounded-lg" />
          ))}
        </div>
        {id && (
          <div className="flex gap-3 items-center">
            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />
            {images.length > 0 && <button type="button" onClick={clearPhotos} className="text-xs text-ink-500 underline">Очистить</button>}
          </div>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-ink-500">{error}</p>}
      <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? 'Сохранение…' : id ? 'Сохранить' : 'Создать'}
      </button>
    </div>
  );
}
