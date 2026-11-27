import { Capacitor, registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { ImageResult } from '@/types';
import { uniqueNames } from './formats';

interface SharedFile { id: string; name: string; path: string; mime: string }

interface FilesPlugin {
  begin(options: { name: string }): Promise<{ id: string }>;
  append(options: { id: string; data: string }): Promise<void>;
  save(options: { id: string; mime: string }): Promise<{ canceled: boolean }>;
  share(options: { id: string; mime: string }): Promise<void>;
  discard(options: { id: string }): Promise<void>;
  takeImports(): Promise<{ files: SharedFile[]; errors: number }>;
  releaseImport(options: { id: string }): Promise<void>;
  addListener(event: 'importsAvailable', listener: () => void): Promise<PluginListenerHandle>;
}

type Writer = { write(data: Uint8Array<ArrayBuffer>): Promise<void>; close(): Promise<void>; abort(): Promise<void> };
interface SaveHandle { createWritable(): Promise<Writer> }

const native = registerPlugin<FilesPlugin>('PixForgeFiles');
export const androidApp = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();

function b64(bytes: Uint8Array) {
  let binary = '';
  for (let start = 0; start < bytes.length; start += 8192) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  }
  return btoa(binary);
}

async function streamZip(files: ImageResult[], write: (data: Uint8Array<ArrayBuffer>) => Promise<void>, progress: (value: number) => void) {
  const { Zip, ZipPassThrough } = await import('fflate');
  const names = uniqueNames(files.map(item => item.name));
  const total = files.reduce((size, file) => size + file.blob.size, 0);
  let written = 0;
  let pending = Promise.resolve();
  const zip = new Zip((error, data) => {
    pending = pending.then(() => {
      if (error) throw error;
      return write(new Uint8Array(data));
    });
  });
  try {
    for (const [index, file] of files.entries()) {
      const entry = new ZipPassThrough(names[index]);
      zip.add(entry);
      await pending;
      const reader = file.blob.stream().getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          entry.push(value);
          await pending;
          written += value.length;
          progress(Math.min(99, Math.round(written * 100 / total)));
        }
        entry.push(new Uint8Array(), true);
        await pending;
      } finally { await reader.cancel(); reader.releaseLock(); }
    }
    zip.end();
    await pending;
    progress(100);
  } finally { zip.terminate(); }
}

export async function exportFiles(
  files: ImageResult[], share: boolean, progress: (value: number) => void, saveAs = false,
) {
  if (!files.length) return false;
  const single = files.length === 1 ? files[0] : undefined;
  const name = single?.name || 'PixForge.zip';
  const mime = single?.blob.type || 'application/zip';
  const write = async (sink: (data: Uint8Array<ArrayBuffer>) => Promise<void>) => {
    if (!single) return streamZip(files, sink, progress);
    const blob = single.blob;
    for (let offset = 0; offset < blob.size; offset += 256 * 1024) {
      await sink(new Uint8Array(await blob.slice(offset, offset + 256 * 1024).arrayBuffer()));
      progress(Math.round(Math.min(1, (offset + 256 * 1024) / blob.size) * 100));
    }
  };

  if (androidApp) {
    const { id } = await native.begin({ name });
    let keepForShare = false;
    try {
      await write(async data => {
        for (let start = 0; start < data.length; start += 256 * 1024) {
          await native.append({ id, data: b64(data.subarray(start, start + 256 * 1024)) });
        }
      });
      if (share) {
        await native.share({ id, mime });
        keepForShare = true;
        return true;
      }
      return !(await native.save({ id, mime })).canceled;
    } finally { if (!keepForShare) await native.discard({ id }).catch(() => {}); }
  }

  const filePicker = (window as Window & {
    showSaveFilePicker?: (options: { suggestedName: string }) => Promise<SaveHandle>;
  }).showSaveFilePicker;
  if (!share && saveAs && filePicker) {
    const writer = await (await filePicker.call(window, { suggestedName: name })).createWritable();
    try {
      await write(data => writer.write(data));
      await writer.close();
      return true;
    } catch (error) {
      await writer.abort().catch(() => {});
      throw error;
    }
  }
  let blob = single?.blob;
  if (!blob) {
    const chunks: BlobPart[] = [];
    await write(async data => { chunks.push(data); });
    blob = new Blob(chunks, { type: mime });
  }
  if (share) {
    const file = new File([blob], name, { type: mime });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
    throw new Error('此浏览器暂不支持分享文件，请选择下载');
  }
  const url = single?.url || URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  if (!single) window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

export async function listenForAndroidImports(onFiles: (files: File[], errors: number) => void, signal?: AbortSignal) {
  if (!androidApp) return () => {};
  let closed = false;
  let queue = Promise.resolve();
  const receive = () => {
    queue = queue.then(async () => {
      if (closed || signal?.aborted) return;
      const incoming = await native.takeImports();
      const files: File[] = [];
      let errors = incoming.errors;
      for (const item of incoming.files) {
        try {
          const response = await fetch(Capacitor.convertFileSrc(item.path));
          if (!response.ok) throw new Error('读取共享图片失败');
          files.push(new File([await response.blob()], item.name, { type: item.mime }));
        } catch { errors++; }
        finally { await native.releaseImport({ id: item.id }).catch(() => {}); }
      }
      if (!closed && !signal?.aborted && (files.length || errors)) onFiles(files, errors);
    }).catch(() => { if (!closed) onFiles([], 1); });
  };
  const listener = await native.addListener('importsAvailable', receive);
  receive();
  return () => { closed = true; void listener.remove(); };
}
