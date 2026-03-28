'use client';

import { Volume } from '@/types';

interface Props {
  availableVolumes: Volume[];
  prices: Partial<Record<Volume, number>>;
  selected: Volume;
  onChange: (v: Volume) => void;
}

const volumeLabels: Record<Volume, string> = {
  '2ml': '2 мл',
  '5ml': '5 мл',
  '10ml': '10 мл',
  '50ml': '50 мл',
  '100ml': '100 мл',
};

const isDecant = (v: Volume) => ['2ml', '5ml', '10ml'].includes(v);

function VolumeButton({
  volume,
  price,
  selected,
  onClick,
}: {
  volume: Volume;
  price: number | undefined;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 rounded-xl border text-sm text-left transition-all duration-200 focus:outline-none ${
        selected
          ? 'border-ink-900 bg-ink-900 text-white shadow-md scale-[1.03]'
          : 'border-cream-200 bg-white text-ink-700 hover:border-ink-700 hover:shadow-sm hover:-translate-y-px'
      }`}
    >
      <span className="block font-semibold">{volumeLabels[volume]}</span>
      <span className={`block text-xs mt-0.5 ${selected ? 'text-white/60' : 'text-ink-300'}`}>
        {price?.toLocaleString('ru-RU')} ₽
      </span>
    </button>
  );
}

export default function VolumeSelector({ availableVolumes, prices, selected, onChange }: Props) {
  const decants = availableVolumes.filter(isDecant);
  const bottles = availableVolumes.filter((v) => !isDecant(v));

  return (
    <div className="flex flex-col gap-6">
      {decants.length > 0 && (
        <div>
          <p className="label text-ink-300 mb-3">Распивы</p>
          <div className="flex flex-wrap gap-2.5">
            {decants.map((v) => (
              <VolumeButton
                key={v}
                volume={v}
                price={prices[v]}
                selected={selected === v}
                onClick={() => onChange(v)}
              />
            ))}
          </div>
        </div>
      )}
      {bottles.length > 0 && (
        <div>
          <p className="label text-ink-300 mb-3">Оригинал (полный флакон)</p>
          <div className="flex flex-wrap gap-2.5">
            {bottles.map((v) => (
              <VolumeButton
                key={v}
                volume={v}
                price={prices[v]}
                selected={selected === v}
                onClick={() => onChange(v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
