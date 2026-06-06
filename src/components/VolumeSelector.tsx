'use client';

import { Volume } from '@/types';
import { trackEvent } from '@/lib/analytics';
import { VOLUME_LABELS } from '@/lib/constants';

interface Props {
  availableVolumes: Volume[];
  prices: Partial<Record<Volume, number>>;
  selected: Volume;
  onChange: (v: Volume) => void;
  originalVolumeMl?: number;
}

function getVolumeLabel(volume: Volume, originalVolumeMl?: number): string {
  if (volume === 'original' && originalVolumeMl) return `${originalVolumeMl} мл`;
  return VOLUME_LABELS[volume];
}

function VolumeButton({
  volume,
  price,
  selected,
  onClick,
  originalVolumeMl,
}: {
  volume: Volume;
  price: number | undefined;
  selected: boolean;
  onClick: () => void;
  originalVolumeMl?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`px-5 py-3.5 rounded-xl text-left transition-all duration-200 ${
        selected
          ? 'bg-ink-900 text-white'
          : 'bg-cream-50 text-ink-700 hover:-translate-y-px'
      }`}
      style={{
        boxShadow: selected
          ? '0px 0px 0px 1px #141413, 0px 4px 12px rgba(0,0,0,0.1)'
          : '0px 0px 0px 1px #e8e6dc',
      }}
    >
      <span className="block text-sm">{getVolumeLabel(volume, originalVolumeMl)}</span>
      <span className={`block text-xs mt-1 ${selected ? 'text-white/60' : 'text-ink-300'}`}>
        {price?.toLocaleString('ru-RU')} ₽
      </span>
    </button>
  );
}

export default function VolumeSelector({
  availableVolumes,
  prices,
  selected,
  onChange,
  originalVolumeMl,
}: Props) {
  const handleChange = (v: Volume) => {
    trackEvent('volume_select', { volume: v, price: prices[v] });
    onChange(v);
  };

  const decants = availableVolumes.filter((v) => v !== 'original');
  const bottles = availableVolumes.filter((v) => v === 'original');

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
                onClick={() => handleChange(v)}
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
                onClick={() => handleChange(v)}
                originalVolumeMl={originalVolumeMl}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
