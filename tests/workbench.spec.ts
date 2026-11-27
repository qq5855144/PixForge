import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

type Input = { name: string; mimeType: string; buffer: Buffer };

async function sample(page: Page, name = 'sample.png', dimensions = [320, 160]): Promise<Input> {
  const data = await page.evaluate(([width, height]) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#905ee1';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#83e3ac';
    ctx.fillRect(0, 0, width / 3, height / 3);
    return canvas.toDataURL().split(',')[1];
  }, dimensions);
  return { name, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}

async function upload(page: Page, inputs: Input[]) {
  await page.locator('input[type="file"]').setInputFiles(inputs);
}

async function process(page: Page) {
  await page.getByRole('button', { name: '开始处理', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新处理', exact: true })).toBeEnabled({ timeout: 20_000 });
}

async function download(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: /^下载/ }).click();
  const file = await pending;
  const path = await file.path();
  if (!path) throw new Error('导出文件缺少路径');
  return { name: file.suggestedFilename(), data: await readFile(path) };
}

test('encodes real GIF and AVIF output', async ({ page }) => {
  await page.goto('/');
  await upload(page, [await sample(page)]);
  await page.getByRole('button', { name: 'GIF', exact: true }).click();
  await process(page);
  const gif = await download(page);
  expect(gif.name).toBe('sample.gif');
  expect(gif.data.subarray(0, 6).toString()).toBe('GIF89a');

  await page.getByRole('button', { name: 'AVIF', exact: true }).click();
  await process(page);
  const avif = await download(page);
  expect(avif.name).toBe('sample.avif');
  expect(avif.data.subarray(4, 12).toString()).toBe('ftypavif');
});

test('converts viewBox-only SVG while preserving its aspect ratio', async ({ page }) => {
  await page.goto('/');
  await upload(page, [{ name: 'drawing.svg', mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160"><rect width="320" height="160" fill="green"/></svg>') }]);
  await page.getByRole('button', { name: 'WebP', exact: true }).click();
  await process(page);
  const output = await download(page);
  expect(output.data.subarray(8, 12).toString()).toBe('WEBP');
  await expect(page.locator('.file-result')).toContainText('320 × 160');
});

test('continues after appending images and retains both same-name ZIP entries', async ({ page }) => {
  await page.goto('/');
  const source = await sample(page, 'same.png');
  await upload(page, [source]);
  await process(page);
  await upload(page, [source]);
  await process(page);
  const result = await download(page);
  const zip = await JSZip.loadAsync(result.data);
  expect(Object.keys(zip.files)).toEqual(['same.webp', 'same (2).webp']);

  await page.getByRole('button', { name: '压缩图片', exact: true }).click();
  await page.getByLabel('目标体积').fill('4');
  await process(page);
  const compressed = await download(page);
  const entries = Object.values((await JSZip.loadAsync(compressed.data)).files);
  for (const entry of entries) expect((await entry.async('uint8array')).byteLength).toBeLessThanOrEqual(4096);
});

test('applies rotation with a nondestructive crop and previews original and result', async ({ page }) => {
  await page.goto('/');
  await upload(page, [await sample(page)]);
  await page.getByRole('button', { name: '裁剪尺寸', exact: true }).click();
  await page.getByRole('button', { name: '裁剪 sample.png' }).click();
  await page.getByRole('button', { name: '旋转', exact: true }).click();
  await expect(page.getByRole('button', { name: '应用', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await process(page);
  await expect(page.locator('.file-result')).toContainText('144 × 288');
  const output = await download(page);
  expect(output.name).toBe('sample_cropped.png');
  expect(output.data.subarray(1, 4).toString()).toBe('PNG');
  await page.getByRole('button', { name: '预览 sample.png' }).click();
  await expect(page.getByRole('img', { name: '原图', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '处理结果', exact: true })).toBeVisible();
});

test('keeps settings and the primary action in the initial mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  const source = await sample(page);
  await upload(page, Array.from({ length: 100 }, (_, index) => ({ ...source, name: `${index}.png` })));
  const panel = page.getByRole('region', { name: '输出设置' });
  await expect(panel.or(page.getByRole('complementary', { name: '输出设置' }))).toBeInViewport();
  await expect(page.getByRole('button', { name: '开始处理', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test('preserves animation through GIF resize or explicitly extracts the first frame', async ({ page }) => {
  await page.goto('/');
  const source = Buffer.from('R0lGODlhDAAGAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACwAAACwAAAAADAAGAAAIEAABCBxIsKDBgwgTKlxoMCAAIfkEAREAAQAsAAAAAAwABgCBAAD/AAAAAAAAAAAACBAAAQgcSLCgwYMIEypcaDAgADs=', 'base64');
  await upload(page, [{ name: 'animated.gif', mimeType: 'image/gif', buffer: source }]);
  await page.getByRole('button', { name: 'GIF', exact: true }).click();
  await page.getByText('尺寸与更多选项').click();
  await page.getByLabel('宽度').fill('6');
  await process(page);
  const resized = await download(page);
  const { parseGIF } = await import('gifuct-js');
  const parse = (data: Buffer) => parseGIF(Uint8Array.from(data).buffer);
  const animated = parse(resized.data);
  expect(animated.lsd.width).toBe(6);
  expect(animated.frames.filter(frame => 'image' in frame)).toHaveLength(2);

  await page.getByLabel('动画图片').selectOption('first');
  await process(page);
  const first = parse((await download(page)).data);
  expect(first.frames.filter(frame => 'image' in frame)).toHaveLength(1);
});

test('applies a reusable crop, resize and output preset', async ({ page }) => {
  await page.goto('/');
  await upload(page, [await sample(page, 'avatar.png')]);
  await page.getByLabel('预设', { exact: true }).selectOption('avatar');
  await page.getByRole('button', { name: '保存为预设', exact: true }).click();
  await page.getByLabel('预设名称').fill('方形头像');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.reload();
  await upload(page, [await sample(page, 'avatar.png')]);
  await page.getByLabel('预设', { exact: true }).selectOption({ label: '方形头像' });
  await process(page);
  await expect(page.locator('.file-result')).toContainText('512 × 512');
});

test('removes JPEG EXIF by default and restores it with normalized orientation on request', async ({ page }) => {
  await page.goto('/');
  const jpg = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 20;
    return canvas.toDataURL('image/jpeg').split(',')[1];
  });
  // Minimal little-endian TIFF with one Orientation tag (6 = 90°).
  const exif = Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000', 'hex');
  const data = Buffer.from(jpg, 'base64');
  await upload(page, [{ name: 'photo.jpg', mimeType: 'image/jpeg',
    buffer: Buffer.concat([data.subarray(0, 2), exif, data.subarray(2)]) }]);
  await page.getByRole('button', { name: 'JPG', exact: true }).click();
  await process(page);
  const stripped = await download(page);
  expect(stripped.data.includes(Buffer.from('Exif\0\0'))).toBe(false);

  await page.getByText('尺寸与更多选项').click();
  await page.getByRole('checkbox', { name: /保留 JPEG EXIF/ }).check();
  await process(page);
  const preserved = await download(page);
  const offset = preserved.data.indexOf(Buffer.from('Exif\0\0'));
  expect(offset).toBeGreaterThanOrEqual(0);
  expect(preserved.data.readUInt16LE(offset + 24)).toBe(1);
});
