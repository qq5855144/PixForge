import { FORMATS, MAX_DIMENSION, MAX_PIXELS } from './formats';

const NS = 'http://www.w3.org/2000/svg';
const ALLOWED = new Set([
  'svg', 'g', 'defs', 'symbol', 'style', 'use', 'image', 'path', 'rect', 'circle', 'ellipse',
  'polygon', 'polyline', 'line', 'text', 'tspan', 'textPath', 'title', 'desc',
  'linearGradient', 'radialGradient', 'stop', 'pattern', 'clipPath', 'mask', 'marker',
  'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight',
  'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur',
  'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence',
]);
const FRAGMENT = /^#[a-z0-9_:.-]+$/i;
const RASTER_DATA = /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z0-9+/=\s]+$/i;
const LOCAL_URL = /url\(\s*(['"]?)#[a-z0-9_:.-]+\1\s*\)/gi;

function safePaint(value: string) {
  return !/[\\@]/.test(value) && !/url\s*\(|image-set\s*\(|image\s*\(/i.test(value.replace(LOCAL_URL, ''));
}

function length(value: string | null) {
  if (!value || !/^\s*(?:\d+\.?\d*|\.\d+)(?:px)?\s*$/i.test(value)) return 0;
  return Number.parseFloat(value);
}

export async function cleanSvg(file: File) {
  if (file.size > 30 * 1024 ** 2) throw new Error('SVG 文件过大');
  const doc = new DOMParser().parseFromString(await file.text(), 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.doctype || root.namespaceURI !== NS || root.localName !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('SVG 文件无效');
  }

  for (const node of [root, ...root.querySelectorAll('*')]) {
    if (node.namespaceURI !== NS || !ALLOWED.has(node.localName) ||
      (node.localName === 'style' && !safePaint(node.textContent || ''))) {
      node.remove();
      continue;
    }
    for (const attr of [...node.attributes]) {
      const name = attr.localName.toLowerCase();
      if (attr.namespaceURI === 'http://www.w3.org/2000/xmlns/') continue;
      if (name === 'href') {
        if (FRAGMENT.test(attr.value) || (node.localName === 'image' && RASTER_DATA.test(attr.value))) continue;
      } else if (
        !name.startsWith('on') && name !== 'src' && name !== 'base' &&
        !attr.namespaceURI && safePaint(attr.value)
      ) continue;
      node.removeAttributeNode(attr);
    }
  }

  const box = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const boxRatio = box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0 ? box[2] / box[3] : 0;
  let width = length(root.getAttribute('width'));
  let height = length(root.getAttribute('height'));
  if (!width && !height && boxRatio) [width, height] = box.slice(2);
  width ||= height && boxRatio ? height * boxRatio : 300;
  height ||= boxRatio ? width / boxRatio : 150;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) throw new Error('SVG 尺寸超出处理范围');

  root.setAttribute('width', String(Math.max(1, Math.round(width))));
  root.setAttribute('height', String(Math.max(1, Math.round(height))));
  return new Blob([new XMLSerializer().serializeToString(root)], { type: FORMATS.svg.mime });
}

export async function loadImage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } catch {
    throw new Error('无法解码此图片');
  } finally {
    URL.revokeObjectURL(url);
  }
}
