import type { Edits, Format, OutputSettings } from '@/types';

export const FORMATS: Record<Format, { label: string; mime: string; ext: string }> = {
  jpeg: { label: 'JPG', mime: 'image/jpeg', ext: 'jpg' },
  png: { label: 'PNG', mime: 'image/png', ext: 'png' },
  webp: { label: 'WebP', mime: 'image/webp', ext: 'webp' },
  avif: { label: 'AVIF', mime: 'image/avif', ext: 'avif' },
  gif: { label: 'GIF', mime: 'image/gif', ext: 'gif' },
  svg: { label: 'SVG', mime: 'image/svg+xml', ext: 'svg' },
};

export const EMPTY_EDITS: Edits = { rotation: 0 };
export const OUTPUT_DEFAULTS: OutputSettings = {
  format: 'webp',
  quality: 85,
  keepAspect: true,
  preserveAnimation: true,
  preserveExif: false,
};
export const MAX_FILES = 300;
export const MAX_PIXELS = 60_000_000;
export const MAX_DIMENSION = 16_384;

export function isSvg(file: File) {
  return file.type === FORMATS.svg.mime || /\.svg$/i.test(file.name);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function safeName(name: string) {
  // Control characters and path separators are invalid in export names.
  // eslint-disable-next-line no-control-regex
  return name.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 140) || 'image';
}

export function baseName(name: string) {
  const index = name.lastIndexOf('.');
  return safeName(index > 0 ? name.slice(0, index) : name);
}

export function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  return names.map(name => {
    const base = baseName(name);
    const at = name.lastIndexOf('.');
    const ext = at > 0 ? name.slice(at).toLowerCase().replace(/[^.a-z0-9]/g, '') : '';
    let entry = `${base}${ext}`;
    for (let n = 2; seen.has(entry.toLowerCase()); n++) entry = `${base} (${n})${ext}`;
    seen.add(entry.toLowerCase());
    return entry;
  });
}
