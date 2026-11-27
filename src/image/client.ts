import type { Edits, ImageOutput, OutputSettings } from '@/types';
import { EMPTY_EDITS, isSvg } from './formats';
import type { Job, PreviewResult, Request, Response } from './worker-protocol';

const workerAvailable = () => typeof Worker !== 'undefined' &&
  typeof createImageBitmap === 'function' &&
  typeof OffscreenCanvas !== 'undefined' &&
  typeof OffscreenCanvas.prototype.convertToBlob === 'function';

class WorkerUnavailable extends Error {}

export class ImageClient {
  private worker?: Worker;
  private workerFailed = false;

  private run(job: Request, signal?: AbortSignal, progress?: (value: number) => void) {
    try {
      this.worker ||= new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      throw new WorkerUnavailable('后台处理器无法启动');
    }
    const worker = this.worker;
    return new Promise<PreviewResult | ImageOutput>((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener('message', receive);
        worker.removeEventListener('error', unavailable);
        worker.removeEventListener('messageerror', unavailable);
        signal?.removeEventListener('abort', abort);
      };
      const receive = (event: MessageEvent<Response>) => {
        const data = event.data;
        if (data.kind === 'progress') {
          progress?.(data.value);
          return;
        }
        cleanup();
        if (data.kind === 'error') reject(new Error(data.message));
        else resolve(data.result);
      };
      const unavailable = () => {
        cleanup();
        reject(new WorkerUnavailable('后台处理器不可用'));
      };
      const abort = () => {
        cleanup();
        this.close();
        reject(signal?.reason);
      };
      if (signal?.aborted) { abort(); return; }
      worker.addEventListener('message', receive);
      worker.addEventListener('error', unavailable);
      worker.addEventListener('messageerror', unavailable);
      signal?.addEventListener('abort', abort, { once: true });
      try {
        worker.postMessage(job, job.bitmap ? [job.bitmap] : []);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  private async perform(file: File, job: Job, signal?: AbortSignal, progress?: (value: number) => void) {
    signal?.throwIfAborted();
    let source: Blob = file;
    let svgImage: HTMLImageElement | undefined;
    if (isSvg(file)) {
      const { cleanSvg, loadImage } = await import('./svg');
      source = await cleanSvg(file);
      svgImage = await loadImage(source);
    }
    signal?.throwIfAborted();
    if (!this.workerFailed && workerAvailable()) {
      let bitmap: ImageBitmap | undefined;
      try {
        if (svgImage) bitmap = await createImageBitmap(svgImage);
        return await this.run({ ...job, source, bitmap }, signal, progress);
      } catch (error) {
        if (!(error instanceof WorkerUnavailable)) throw error;
        this.workerFailed = true;
        this.close();
      } finally { bitmap?.close(); }
    }
    const engine = await import('./engine');
    signal?.throwIfAborted();
    return job.kind === 'preview'
      ? engine.makePreview(source, job.maxSide, job.edits, svgImage)
      : engine.processImage(source, job.settings, job.edits, progress || (() => {}), signal, svgImage);
  }

  async preview(file: File, maxSide: number, edits = EMPTY_EDITS, signal?: AbortSignal) {
    return this.perform(file, { kind: 'preview', maxSide, edits }, signal) as Promise<PreviewResult>;
  }

  async output(file: File, settings: OutputSettings, edits: Edits, signal: AbortSignal, progress: (value: number) => void) {
    return this.perform(file, { kind: 'output', settings, edits }, signal, progress) as Promise<ImageOutput>;
  }

  close() {
    this.worker?.terminate();
    this.worker = undefined;
  }
}
