import type { Edits, Format, ImageInfo, ImageOutput, OutputSettings, Region } from '@/types';
import { EMPTY_EDITS, FORMATS, MAX_DIMENSION } from './formats';
import { assertImageSize, inspect } from './inspect';

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
type Source = ImageBitmap | HTMLImageElement;

function canvas(width: number, height: number): Canvas {
  assertImageSize(width, height);
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(width, height);
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return element;
}

function context(target: Canvas): Context {
  const ctx = target.getContext('2d');
  if (!ctx) throw new Error('无法创建图像画布');
  return ctx as Context;
}

function dimensions(image: Source) {
  return 'naturalWidth' in image
    ? [image.naturalWidth, image.naturalHeight] as const : [image.width, image.height] as const;
}

async function decode(source: Blob, bitmap?: Source): Promise<Source> {
  if (bitmap) return bitmap;
  try {
    return await createImageBitmap(source);
  } catch {
    if (typeof document !== 'undefined') {
      const { loadImage } = await import('./svg');
      return loadImage(source);
    }
    throw new Error('无法解码此图片，请检查文件格式和内容');
  }
}

function regionFor(width: number, height: number, edits: Edits, aspect?: number): Region {
  if (edits.rotation === 90 || edits.rotation === 270) [width, height] = [height, width];
  const w = aspect ? Math.min(1, height * aspect / width) : 1;
  const h = aspect ? Math.min(1, width / (height * aspect)) : 1;
  const r = edits.crop?.region || { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h };
  const x = Math.min(width - 1, Math.max(0, Math.round(r.x * width)));
  const y = Math.min(height - 1, Math.max(0, Math.round(r.y * height)));
  return { x, y, width: Math.max(1, Math.min(width - x, Math.round(r.width * width))),
    height: Math.max(1, Math.min(height - y, Math.round(r.height * height))) };
}

function outputSize(region: Region, settings: Pick<OutputSettings, 'width' | 'height' | 'keepAspect'>) {
  const { width: w, height: h } = region;
  const { width, height, keepAspect } = settings;
  if (!width && !height) return [w, h] as const;
  if (!keepAspect && width && height) return [width, height] as const;
  const scale = Math.min(width ? width / w : Infinity, height ? height / h : Infinity);
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))] as const;
}

function render(
  target: Canvas, image: CanvasImageSource, sourceWidth: number, sourceHeight: number,
  region: Region, edits: Edits, format: Format,
) {
  const { width, height } = target;
  const ctx = context(target);
  ctx.clearRect(0, 0, width, height);
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  const crop = edits.crop;
  if (crop?.shape === 'round') {
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.clip();
  } else if (crop?.radius) {
    const radius = Math.min(width, height) * crop.radius / 200;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(0, 0, width, height, radius);
    else {
      ctx.moveTo(radius, 0);
      ctx.arcTo(width, 0, width, height, radius);
      ctx.arcTo(width, height, 0, height, radius);
      ctx.arcTo(0, height, 0, 0, radius);
      ctx.arcTo(0, 0, width, 0, radius);
      ctx.closePath();
    }
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(width / region.width, height / region.height);
  ctx.translate(-region.x, -region.y);
  if (edits.rotation === 90) ctx.translate(sourceHeight, 0);
  if (edits.rotation === 180) ctx.translate(sourceWidth, sourceHeight);
  if (edits.rotation === 270) ctx.translate(0, sourceWidth);
  ctx.rotate(edits.rotation * Math.PI / 180);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

async function encodeNative(target: Canvas, type: string, quality: number) {
  const blob = 'convertToBlob' in target
    ? await target.convertToBlob({ type, quality })
    : await new Promise<Blob>((resolve, reject) => target.toBlob(
        value => value ? resolve(value) : reject(new Error('图像编码失败')), type, quality));
  if (blob.type !== type) throw new Error('此环境不支持该输出格式');
  return blob;
}

async function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function encode(target: Canvas, format: Format, quality: number): Promise<Blob> {
  if (format === 'gif') {
    const { createGifWriter } = await import('./animation');
    const writer = await createGifWriter();
    writer.frame(context(target).getImageData(0, 0, target.width, target.height));
    return writer.finish();
  }
  if (format === 'avif') {
    const { encodeAvif } = await import('./avif');
    const image = context(target).getImageData(0, 0, target.width, target.height);
    return encodeAvif(image, quality);
  }
  if (format === 'svg') {
    const { width, height } = target;
    const data = await dataUrl(await encodeNative(target, FORMATS.png.mime, 1));
    return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${data}" width="${width}" height="${height}"/></svg>`], { type: FORMATS.svg.mime });
  }
  return encodeNative(target, FORMATS[format].mime, quality / 100);
}

const lossyFormats = new Set<Format>(['jpeg', 'webp', 'avif']);

async function fitBytes(
  target: Canvas, format: Format, settings: OutputSettings, draw: () => void,
  prepareEncode: (blob: Blob) => Promise<Blob>, progress: (value: number) => void, signal?: AbortSignal,
) {
  const limit = settings.targetKB ? settings.targetKB * 1024 : 0;
  const initialQuality = Math.max(1, Math.min(settings.quality, 100));
  let scale = 0;
  while (true) {
    signal?.throwIfAborted();
    draw();
    const attempt = async (quality: number) => {
      signal?.throwIfAborted();
      return prepareEncode(await encode(target, format, quality));
    };
    const initial = await attempt(initialQuality);
    if (!limit || initial.size <= limit) return initial;

    let smallest = initial;
    if (lossyFormats.has(format)) {
      const min = Math.min(8, initialQuality);
      smallest = await attempt(min);
      if (smallest.size <= limit) {
        let lower = min;
        let upper = initialQuality;
        let best = smallest;
        for (let i = 0; i < 6 && lower + 1 < upper; i++) {
          const quality = Math.floor((lower + upper) / 2);
          const candidate = await attempt(quality);
          if (candidate.size <= limit) { best = candidate; lower = quality; }
          else upper = quality;
        }
        return best;
      }
    }

    // Exact dimensions take priority. With unlocked bounds we may scale down.
    if (++scale > 5 || (!settings.keepAspect && settings.width && settings.height) ||
      (target.width <= 1 && target.height <= 1)) {
      throw new Error(`无法达到 ${settings.targetKB} KB，请增大目标或减小尺寸`);
    }
    const ratio = Math.max(0.2, Math.min(0.85, Math.sqrt(limit / smallest.size) * 0.92));
    target.width = Math.max(1, Math.floor(target.width * ratio));
    target.height = Math.max(1, Math.floor(target.height * ratio));
    progress(50 + scale * 7);
  }
}

export async function makePreview(source: Blob, maxSide: number, edits = EMPTY_EDITS, bitmap?: Source) {
  let image = bitmap;
  try {
    const { format, animated } = await inspect(source);
    image = await decode(source, image);
    const [width, height] = dimensions(image);
    assertImageSize(width, height);
    const region = regionFor(width, height, edits);
    const ratio = Math.min(1, maxSide / Math.max(region.width, region.height));
    const target = canvas(Math.max(1, Math.round(region.width * ratio)), Math.max(1, Math.round(region.height * ratio)));
    try {
      render(target, image, width, height, region, edits, 'png');
      const info: ImageInfo = { width, height, animated, format };
      return { blob: await encodeNative(target, 'image/png', 1), info };
    } finally { target.width = 1; target.height = 1; }
  } finally { if (image && 'close' in image) image.close(); }
}

export async function processImage(
  source: Blob, settings: OutputSettings, edits: Edits,
  progress: (value: number) => void, signal?: AbortSignal, bitmap?: Source,
): Promise<ImageOutput> {
  for (const side of [settings.width, settings.height]) {
    if (side !== undefined && (!Number.isInteger(side) || side < 1 || side > MAX_DIMENSION)) {
      throw new Error('宽高需为 1 至 16384 的整数');
    }
  }
  if (settings.targetKB !== undefined && (!Number.isFinite(settings.targetKB) || settings.targetKB < 1)) {
    throw new Error('目标体积至少为 1 KB');
  }
  let image: Source | undefined = bitmap;
  try {
    const input = await inspect(source);
    const format = settings.format === 'original' ? input.format : settings.format;
    if (!format) throw new Error('此输入格式无法按原格式编码，请选择其他输出格式');
    if (input.format && FORMATS[input.format].mime !== source.type) {
      source = source.slice(0, source.size, FORMATS[input.format].mime);
    }
    const noGeometry = !edits.crop && !edits.rotation && !settings.width && !settings.height && !settings.cropAspect;
    const originalAnimation = input.animated && settings.preserveAnimation && format === input.format && noGeometry && !settings.targetKB;
    progress(10);
    signal?.throwIfAborted();

    if (input.animated && settings.preserveAnimation && !originalAnimation) {
      if (format !== 'gif') throw new Error('请导出为 GIF 以保留动画，或选择提取首帧');
      if (settings.targetKB) throw new Error('带动画的 GIF 暂不支持目标体积，请调整尺寸或选择提取首帧');
      const { animatedFrames, createGifWriter } = await import('./animation');
      const writer = await createGifWriter();
      let target: Canvas | undefined;
      let decodedPixels = 0;
      try {
        await animatedFrames(source, (frame, w, h, delay, repeat) => {
          assertImageSize(w, h);
          decodedPixels += w * h;
          if (decodedPixels > 150_000_000) throw new Error('动画过大，请缩小源文件或提取首帧');
          const region = regionFor(w, h, edits, settings.cropAspect);
          target ||= canvas(...outputSize(region, settings));
          render(target, frame, w, h, region, edits, 'gif');
          writer.frame(context(target).getImageData(0, 0, target.width, target.height), delay, repeat);
        }, progress, signal);
        if (!target) throw new Error('无法解码动画');
        return { blob: writer.finish(), width: target.width, height: target.height, format, animated: true };
      } finally { if (target) target.width = 1; }
    }

    image = await decode(source, image);
    const [width, height] = dimensions(image);
    assertImageSize(width, height);
    if (originalAnimation || (format === 'svg' && input.format === 'svg' && noGeometry && !settings.targetKB)) {
      return { blob: source, width, height, format, animated: input.animated };
    }
    const region = regionFor(width, height, edits, settings.cropAspect);
    const target = canvas(...outputSize(region, settings));
    try {
      progress(35);
      const jpegExif = settings.preserveExif && input.format === 'jpeg' && format === 'jpeg';
      const prepareEncode = async (blob: Blob) => {
        if (!jpegExif) return blob;
        const { copyJpegExif } = await import('./exif');
        return copyJpegExif(source, blob, target.width, target.height);
      };
      const blob = await fitBytes(target, format, settings,
        () => render(target, image!, width, height, region, edits, format),
        prepareEncode, progress, signal);
      signal?.throwIfAborted();
      if (blob.type !== FORMATS[format].mime || (await inspect(blob, false)).format !== format) {
        throw new Error('实际编码与所选格式不一致');
      }
      progress(100);
      return { blob, width: target.width, height: target.height, format, animated: false };
    } finally { target.width = 1; target.height = 1; }
  } finally { if (image && 'close' in image) image.close(); }
}
