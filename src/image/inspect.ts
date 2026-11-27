import type { Format } from '@/types';
import { FORMATS, MAX_DIMENSION, MAX_PIXELS } from './formats';

const PNG = [137, 80, 78, 71, 13, 10, 26, 10];

export function assertImageSize(width: number, height: number) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
    width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
    throw new Error('尺寸超出范围（单边最多 16384 px，最多 6000 万像素）');
  }
}

async function gifIsAnimated(blob: Blob, first: Uint8Array) {
  let offset = 13 + ((first[10] & 128) ? 3 << ((first[10] & 7) + 1) : 0);
  let start = 0;
  let data = first;
  let frames = 0;
  async function reload() {
    start = offset;
    data = new Uint8Array(await blob.slice(offset, offset + 64 * 1024).arrayBuffer());
  }
  while (offset < blob.size) {
    if (offset - start + 11 > data.length) await reload();
    const kind = data[offset++ - start];
    if (kind === 0x2c) {
      if (++frames > 1) return true;
      if (offset - start + 9 > data.length) return false;
      const local = data[offset + 8 - start];
      offset += 10 + ((local & 128) ? 3 << ((local & 7) + 1) : 0);
    } else if (kind === 0x21) {
      offset++;
    } else break;
    while (offset < blob.size) {
      if (offset - start >= data.length) await reload();
      const size = data[offset++ - start];
      if (!size) break;
      offset += size;
    }
  }
  return false;
}

export async function inspect(blob: Blob, detectAnimation = true) {
  const data = new Uint8Array(await blob.slice(0, 64 * 1024).arrayBuffer());
  const str = (from: number, count: number) => String.fromCharCode(...data.subarray(from, from + count));
  const view = new DataView(data.buffer);
  let format: Format | undefined;
  let animated = false;
  if (PNG.every((value, i) => data[i] === value)) {
    format = 'png';
    if (data.length >= 24) assertImageSize(view.getUint32(16), view.getUint32(20));
    for (let i = 8; i + 12 <= data.length;) {
      const kind = str(i + 4, 4);
      if (kind === 'acTL') { animated = true; break; }
      if (kind === 'IDAT') break;
      i += 12 + view.getUint32(i);
    }
  } else if (data[0] === 255 && data[1] === 216) {
    format = 'jpeg';
    for (let i = 2; i + 8 < data.length && data[i] === 255;) {
      if (data[i + 1] === 255) { i++; continue; }
      const marker = data[i + 1];
      if (marker === 218 || marker === 217) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        assertImageSize(view.getUint16(i + 7), view.getUint16(i + 5));
        break;
      }
      const size = view.getUint16(i + 2);
      if (size < 2) break;
      i += size + 2;
    }
  } else if (str(0, 3) === 'GIF' && data.length >= 13) {
    format = 'gif';
    assertImageSize(view.getUint16(6, true), view.getUint16(8, true));
    animated = detectAnimation && await gifIsAnimated(blob, data);
  } else if (str(0, 4) === 'RIFF' && str(8, 4) === 'WEBP') {
    format = 'webp';
    animated = str(12, 4) === 'VP8X' && Boolean(data[20] & 2);
    if (str(12, 4) === 'VP8X' && data.length >= 30) {
      assertImageSize(1 + (data[24] | data[25] << 8 | data[26] << 16), 1 + (data[27] | data[28] << 8 | data[29] << 16));
    }
  } else if (str(4, 4) === 'ftyp' && data.length >= 16) {
    for (let i = 8; i + 4 <= Math.min(data.length, view.getUint32(0)); i += 4) {
      if (i === 12) continue;
      const brand = str(i, 4);
      if (brand === 'avif' || brand === 'avis') format = 'avif';
      if (brand === 'avis') animated = true;
    }
  }
  return { format: format || (blob.type === FORMATS.svg.mime ? 'svg' as const : undefined), animated };
}
