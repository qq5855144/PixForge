import type { Palette } from 'gifenc';
import { assertImageSize } from './inspect';

type FrameImage = CanvasImageSource;
interface DecoderImage extends VideoFrame {
  duration: number | null;
}

interface Decoder {
  tracks: {
    ready: Promise<void>;
    selectedTrack: { frameCount: number; repetitionCount: number } | null;
  };
  decode(options: { frameIndex: number }): Promise<{ image: DecoderImage }>;
  close(): void;
}

interface DecoderConstructor {
  new (options: { type: string; data: ArrayBuffer }): Decoder;
  isTypeSupported(type: string): Promise<boolean>;
}

export async function animatedFrames(
  source: Blob,
  draw: (frame: FrameImage, width: number, height: number, delay: number, repeat: number) => void,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  const Constructor = (globalThis as typeof globalThis & { ImageDecoder?: DecoderConstructor }).ImageDecoder;
  if (Constructor && await Constructor.isTypeSupported(source.type)) {
    const decoder = new Constructor({ type: source.type, data: await source.arrayBuffer() });
    try {
      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      if (!track || !track.frameCount) throw new Error('无法解码动画');
      if (track.frameCount > 400) throw new Error('动画超过 400 帧，请选择提取首帧或保留原图');
      for (let i = 0; i < track.frameCount; i++) {
        signal?.throwIfAborted();
        const { image } = await decoder.decode({ frameIndex: i });
        try {
          draw(image, image.displayWidth, image.displayHeight, (image.duration || 100_000) / 1000,
            track.repetitionCount === Infinity ? 0 : track.repetitionCount || -1);
        } finally { image.close(); }
        onProgress?.(Math.round(15 + 80 * ((i + 1) / track.frameCount)));
      }
      return;
    } finally { decoder.close(); }
  }

  if (source.type !== 'image/gif') {
    throw new Error('此浏览器无法解码该动画，请选择保留原图或提取首帧');
  }
  const { parseGIF, decompressFrame } = await import('gifuct-js');
  const gif = parseGIF(await source.arrayBuffer());
  const { width, height } = gif.lsd;
  assertImageSize(width, height);
  const frames = gif.frames.filter(frame => 'image' in frame);
  if (!frames.length || frames.length > 400 || width * height * frames.length > 150_000_000) {
    throw new Error('动画过大，请选择提取首帧或保留原图');
  }
  const looping = gif.frames.find(frame => 'application' in frame && frame.application.id.startsWith('NETSCAPE'));
  const repeat = looping && 'application' in looping
    ? (looping.application.blocks[1] || 0) + 256 * (looping.application.blocks[2] || 0) : -1;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const patch = new OffscreenCanvas(1, 1);
  const patchContext = patch.getContext('2d')!;
  for (const [index, frame] of frames.entries()) {
    signal?.throwIfAborted();
    const descriptor = frame.image.descriptor;
    assertImageSize(descriptor.width, descriptor.height);
    const item = decompressFrame(frame, gif.gct, true);
    const { left, top, width: w, height: h } = item.dims;
    const previous = item.disposalType === 3 ? ctx.getImageData(0, 0, width, height) : undefined;
    patch.width = w;
    patch.height = h;
    patchContext.putImageData(new ImageData(new Uint8ClampedArray(item.patch), w, h), 0, 0);
    ctx.drawImage(patch, left, top);
    draw(canvas, width, height, item.delay || 100, repeat);
    if (previous) ctx.putImageData(previous, 0, 0);
    else if (item.disposalType === 2) ctx.clearRect(left, top, w, h);
    onProgress?.(Math.round(15 + 80 * ((index + 1) / frames.length)));
  }
  canvas.width = patch.width = 1;
}

export async function createGifWriter() {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const encoder = GIFEncoder();
  return {
    frame(image: ImageData, delay = 100, repeat = -1) {
      const palette: Palette = quantize(image.data, 256, { format: 'rgba4444', oneBitAlpha: true });
      const index = applyPalette(image.data, palette, 'rgba4444');
      const transparentIndex = palette.findIndex(color => color[3] === 0);
      encoder.writeFrame(index, image.width, image.height, {
        palette, delay, repeat, transparent: transparentIndex >= 0, transparentIndex, dispose: 2,
      });
    },
    finish() {
      encoder.finish();
      return new Blob([encoder.bytes()], { type: 'image/gif' });
    },
  };
}
