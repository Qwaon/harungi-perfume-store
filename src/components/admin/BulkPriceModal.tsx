'use client';

import { useState } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { applyPriceDelta, BULK_PRICE_FIELDS, type BulkPriceField, type BulkPriceMode } from '@/lib/admin/catalog-logic';

const FIELD_LABELS: Record<BulkPriceField, string> = {
  price_5ml: '5мл',
  price_10ml: '10мл',
  price_15ml: '15мл',
  price_20ml: '20мл',
  price_original: 'Оригинал',
};

export interface BulkPriceItem {
  id: string;
  brand: string;
  name: string;
  price_5ml: number | null;
  price_10ml: number | null;
  price_15ml: number | null;
  price_20ml: number | null;
  price_original: number | null;
}

interface PreviewRow {
  id: string;
  label: string;
  field: BulkPriceField;
  fieldLabel: string;
  oldValue: number;
  newValue: number;
}

export default function BulkPriceModal({
  items, onClose, onApplied,
}: {
  items: BulkPriceItem[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [fields, setFields] = useState<BulkPriceField[]>([]);
  const [mode, setMode] = useState<BulkPriceMode>('percent');
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const toggleField = (f: BulkPriceField) => {
    setFields((p) => (p.includes(f) ? p.filter((x) => x !== f) : [...p, f]));
    setPreview(null);
  };

  const numValue = Number(value);
  const valid = fields.length > 0 && value !== '' && Number.isFinite(numValue);

  const buildPreview = (): PreviewRow[] => {
    const rows: PreviewRow[] = [];
    for (const item of items) {
      for (const field of fields) {
        const old = item[field];
        if (old == null) continue;
        rows.push({
          id: item.id,
          label: `${item.brand} — ${item.name}`,
          field,
          fieldLabel: FIELD_LABELS[field],
          oldValue: old,
          newValue: applyPriceDelta(old, mode, numValue),
        });
      }
    }
    return rows;
  };

  const handlePreview = () => {
    setError('');
    if (!valid) { setError('Выберите поля и укажите значение'); return; }
    const rows = buildPreview();
    if (rows.length === 0) { setError('Нет товаров с заполненными выбранными полями'); return; }
    setPreview(rows);
  };

  const apply = async () => {
    setApplying(true); setError('');
    const res = await fetch('/api/admin/catalog/bulk-price', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: items.map((i) => i.id), fields, mode, value: numValue }),
    });
    setApplying(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) {
      onApplied();
    } else {
      setError(d.error || 'Ошибка применения');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" role="dialog" aria-modal="true" aria-label="Массовое изменение цен">
      <div className="bg-cream-50 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 flex flex-col gap-4">
        <h2 className="font-display text-xl font-light text-ink-900 flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-gold-500" />
          Изменить цены ({items.length})
        </h2>

        <div>
          <span className="label text-ink-500 block mb-1">Поля</span>
          <div className="flex flex-wrap gap-1.5">
            {BULK_PRICE_FIELDS.map((f) => (
              <button key={f} type="button" onClick={() => toggleField(f)}
                className={`text-xs px-3 py-1.5 rounded-full border ${fields.includes(f) ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
                {FIELD_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div>
            <span className="label text-ink-500 block mb-1">Тип</span>
            <div className="flex gap-1.5">
              {(['percent', 'fixed'] as BulkPriceMode[]).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setPreview(null); }}
                  className={`text-xs px-3 py-1.5 rounded-full border ${mode === m ? 'bg-ink-900 text-cream-50 border-ink-900' : 'border-cream-200 text-ink-500'}`}>
                  {m === 'percent' ? 'На процент' : 'На сумму'}
                </button>
              ))}
            </div>
          </div>
          <label className="block flex-1">
            <span className="label text-ink-500 block mb-1">
              Значение {mode === 'percent' ? '(%, напр. -10)' : '(₽, напр. +100)'}
            </span>
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => { setValue(e.target.value); setPreview(null); }}
              className="input-base"
              placeholder={mode === 'percent' ? '+10' : '+100'}
            />
          </label>
        </div>

        {error && <p role="alert" className="text-sm text-ink-500">{error}</p>}

        {preview && (
          <div className="border border-cream-200 rounded-lg max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-cream-100">
                <tr>
                  <th className="text-left p-2 label text-ink-300">Товар</th>
                  <th className="text-left p-2 label text-ink-300">Поле</th>
                  <th className="text-right p-2 label text-ink-300">Было</th>
                  <th className="text-right p-2 label text-ink-300">Станет</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={`${row.id}-${row.field}`} className={i % 2 ? 'bg-cream-50' : ''}>
                    <td className="p-2 text-ink-900 truncate max-w-[160px]">{row.label}</td>
                    <td className="p-2 text-ink-500">{row.fieldLabel}</td>
                    <td className="p-2 text-right text-ink-500">{row.oldValue}</td>
                    <td className="p-2 text-right text-ink-900 font-medium">{row.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-outline text-sm">Отмена</button>
          {!preview ? (
            <button type="button" onClick={handlePreview} className="btn-primary text-sm" disabled={!valid}>
              Предпросмотр
            </button>
          ) : (
            <button type="button" onClick={apply} disabled={applying} className="btn-primary text-sm disabled:opacity-50">
              {applying ? 'Применение…' : `Применить (${preview.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
