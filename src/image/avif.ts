import factory from '@jsquash/avif/codec/enc/avif_enc.js';
import { defaultOptions } from '@jsquash/avif/meta.js';
import { initEmscriptenModule } from '@jsquash/avif/utils.js';

let encoder: ReturnType<typeof create>;

function create() {
  return initEmscriptenModule(factory);
}

export async function encodeAvif(image: ImageData, quality: number) {
  encoder ||= create();
  const module = await encoder;
  const output = module.encode(new Uint8Array(image.data.buffer), image.width, image.height, {
    ...defaultOptions, quality, speed: 8,
  });
  if (!output) throw new Error('AVIF 编码失败');
  return new Blob([new Uint8Array(output)], { type: 'image/avif' });
}
