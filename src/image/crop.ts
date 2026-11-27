import type { Region } from '@/types';

export function centeredRegion(width: number, height: number, aspect?: number): Region {
  const w = aspect ? Math.min(1, height * aspect / width) : 1;
  const h = aspect ? Math.min(1, width / (height * aspect)) : 1;
  return { x: (1 - w * .9) / 2, y: (1 - h * .9) / 2, width: w * .9, height: h * .9 };
}
