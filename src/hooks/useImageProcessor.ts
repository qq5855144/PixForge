import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppMode, AppSettings, Edits, ImageItem, OutputSettings } from '@/types';
import { ImageClient } from '@/image/client';
import { baseName, EMPTY_EDITS, FORMATS, isSvg, MAX_FILES, safeName, uniqueNames } from '@/image/formats';

type BatchStatus = { current: number; total: number; progress: number };

function outputName(item: ImageItem, ext: string, mode: AppMode, settings: AppSettings, index: number, count: number) {
  const base = baseName(item.source.name);
  if (settings.outputNaming === 'rename') {
    const name = safeName(settings.renamePattern.trim() || 'processed');
    return `${name}${count > 1 ? `_${index + 1}` : ''}.${ext}`;
  }
  const suffixes: Record<AppMode, string> = { convert: '_converted', compress: '_compressed', crop: '_cropped' };
  return `${base}${settings.outputNaming === 'suffix' || mode === 'crop' ? suffixes[mode] : ''}.${ext}`;
}

function inputImage(file: File) {
  return file.size > 0 && (file.type.startsWith('image/') ||
    /\.(?:png|jpe?g|webp|gif|avif|svg|bmp|ico|heic|heif|tiff?)$/i.test(file.name) || isSvg(file));
}

export function useImageProcessor() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [batch, setBatch] = useState<BatchStatus>();
  const current = useRef<ImageItem[]>([]);
  const worker = useRef<ImageClient | null>(null);
  const previewWorker = useRef<ImageClient | null>(null);
  const previewQueue = useRef<Promise<void>>(Promise.resolve());
  const previewAbort = useRef<AbortController | null>(null);
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      active.current?.abort();
      previewAbort.current?.abort();
      for (const item of current.current) {
        if (item.thumbnail) URL.revokeObjectURL(item.thumbnail);
        if (item.result) URL.revokeObjectURL(item.result.url);
      }
      worker.current?.close();
      previewWorker.current?.close();
      current.current = [];
    };
  }, []);

  const update = useCallback((change: (previous: ImageItem[]) => ImageItem[]) => {
    const next = change(current.current);
    current.current = next;
    setItems(next);
  }, []);

  const patch = useCallback((id: string, changes: Partial<ImageItem>) => {
    update(previous => previous.map(item => item.id === id ? { ...item, ...changes } : item));
  }, [update]);

  const add = useCallback((files: File[]) => {
    const eligible = files.filter(file => file.size <= 100 * 1024 ** 2 && inputImage(file));
    const added = eligible.slice(0, MAX_FILES - current.current.length).map(source => ({
      id: crypto.randomUUID(),
      source,
      edits: EMPTY_EDITS,
      status: 'pending' as const,
    }));
    if (!added.length) return { added: 0, rejected: files.length };
    update(previous => [...previous, ...added]);
    if (!previewAbort.current || previewAbort.current.signal.aborted) previewAbort.current = new AbortController();
    const signal = previewAbort.current.signal;
    previewQueue.current = previewQueue.current.then(async () => {
      const client = previewWorker.current ||= new ImageClient();
      for (const item of added) {
        if (signal.aborted) return;
        if (!current.current.some(entry => entry.id === item.id)) continue;
        try {
          const { blob, info } = await client.preview(item.source, 160, EMPTY_EDITS, signal);
          if (signal.aborted || !current.current.some(entry => entry.id === item.id)) continue;
          patch(item.id, { thumbnail: URL.createObjectURL(blob), info });
        } catch {
          // Processing can provide a format-specific error, even when the thumbnail fails.
        }
      }
      client.close();
    });
    return { added: added.length, rejected: files.length - added.length };
  }, [patch, update]);

  const remove = useCallback((id?: string) => {
    if (active.current) return;
    update(previous => previous.filter(item => {
      if (id && item.id !== id) return true;
      if (item.thumbnail) URL.revokeObjectURL(item.thumbnail);
      if (item.result) URL.revokeObjectURL(item.result.url);
      return false;
    }));
  }, [update]);

  const changeEdits = useCallback((id: string, edits: Edits, undo = false) => {
    if (active.current) return;
    const item = current.current.find(existing => existing.id === id);
    if (!item) return;
    if (item.result) URL.revokeObjectURL(item.result.url);
    patch(id, { edits, undo: undo ? undefined : item.edits, result: undefined, status: 'pending', error: undefined });
  }, [patch]);

  const move = useCallback((id: string, offset: number) => {
    if (active.current) return;
    update(previous => {
      const index = previous.findIndex(item => item.id === id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) return previous;
      const reordered = [...previous];
      const [item] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, item);
      return reordered;
    });
  }, [update]);

  const reorder = useCallback((from: string, to: string) => {
    const start = current.current.findIndex(item => item.id === from);
    const end = current.current.findIndex(item => item.id === to);
    if (start >= 0 && end >= 0) move(from, end - start);
  }, [move]);

  const stop = useCallback(() => active.current?.abort(), []);

  const process = useCallback(async (mode: AppMode, options: OutputSettings, settings: AppSettings, reprocess = false) => {
    if (active.current) return;
    const selected = current.current.filter(item => !item.excluded &&
      (reprocess || item.status !== 'completed'));
    if (!selected.length) return;
    const controller = new AbortController();
    active.current = controller;
    const client = worker.current ||= new ImageClient();
    const plannedNames = uniqueNames(selected.map((item, index) =>
      outputName(item, options.format === 'original' ? 'png' : FORMATS[options.format].ext, mode, settings, index, selected.length)));
    const total = selected.length;

    try {
      for (let index = 0; index < total; index++) {
        if (controller.signal.aborted) break;
        const item = selected[index];
        setBatch({ current: index + 1, total, progress: Math.round(index * 100 / total) });
        patch(item.id, { status: 'processing', error: undefined });
        try {
          const result = await client.output(item.source, options, item.edits, controller.signal, value =>
            setBatch({ current: index + 1, total, progress: Math.round((index + value / 100) * 100 / total) }));
          controller.signal.throwIfAborted();
          if (item.result) URL.revokeObjectURL(item.result.url);
          const name = `${baseName(plannedNames[index])}.${FORMATS[result.format].ext}`;
          patch(item.id, { status: 'completed', result: { ...result, name, url: URL.createObjectURL(result.blob) } });
        } catch (error) {
          patch(item.id, {
            status: controller.signal.aborted ? item.result ? 'completed' : 'pending' : 'error',
            error: controller.signal.aborted ? undefined : error instanceof Error ? error.message : '处理失败',
          });
        }
      }
    } finally {
      client.close();
      active.current = null;
      setBatch(undefined);
    }
  }, [patch]);

  const toggle = useCallback((id: string) => {
    if (active.current) return;
    update(previous => previous.map(item => item.id === id ? { ...item, excluded: !item.excluded } : item));
  }, [update]);

  const invalidate = useCallback(() => {
    if (active.current) return;
    if (!current.current.some(item => item.status === 'completed' || item.status === 'error')) return;
    update(previous => previous.map(item => item.status === 'completed' || item.status === 'error'
      ? { ...item, status: 'pending', error: undefined } : item));
  }, [update]);

  return { items, batch, add, remove, patch, changeEdits, move, reorder, toggle, process, stop, invalidate };
}
