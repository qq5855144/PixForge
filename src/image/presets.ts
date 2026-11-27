import type { AppMode, Format, OutputSettings, Preset } from '@/types';
import { OUTPUT_DEFAULTS } from './formats';

export const MODE_LABELS: Record<AppMode, string> = { convert: '格式转换', compress: '压缩图片', crop: '裁剪尺寸' };

export const BUILTIN_PRESETS: Preset[] = [
  { id: 'avatar', label: '头像 · 512 px', mode: 'crop',
    settings: { ...OUTPUT_DEFAULTS, format: 'png', width: 512, height: 512, cropAspect: 1, preserveAnimation: false } },
  { id: 'web', label: '网页配图 · WebP', mode: 'convert',
    settings: { ...OUTPUT_DEFAULTS, width: 1600, height: 1600, quality: 82, preserveAnimation: false } },
  { id: 'form', label: '表单上传 · 500 KB', mode: 'compress',
    settings: { ...OUTPUT_DEFAULTS, format: 'jpeg', targetKB: 500, preserveAnimation: false } },
];

export function initialOutput(mode: AppMode, webp: boolean): OutputSettings {
  const format: Format | 'original' = mode === 'compress' ? 'original' :
    mode === 'crop' ? 'png' : webp ? 'webp' : 'png';
  const quality = mode === 'compress' ? 78 : OUTPUT_DEFAULTS.quality;
  return { ...OUTPUT_DEFAULTS, format, quality };
}

const STORAGE_KEY = 'pixforge_presets';

export function loadPresets(): Preset[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(item => item && typeof item.id === 'string' && typeof item.label === 'string' &&
      ['compress', 'convert', 'crop'].includes(item.mode) && item.settings &&
      typeof item.settings.quality === 'number').slice(0, 20) as Preset[];
  } catch { return []; }
}

export function storePresets(presets: Preset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}
