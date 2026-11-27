import type { Edits, ImageInfo, ImageOutput, OutputSettings } from '@/types';

export interface PreviewResult {
  blob: Blob;
  info: ImageInfo;
}

export interface PreviewJob {
  kind: 'preview';
  maxSide: number;
  edits: Edits;
}

export interface OutputJob {
  kind: 'output';
  settings: OutputSettings;
  edits: Edits;
}

export type Job = PreviewJob | OutputJob;
export type Request = Job & { source: Blob; bitmap?: ImageBitmap };
export type Response =
  | { kind: 'preview'; result: PreviewResult }
  | { kind: 'output'; result: ImageOutput }
  | { kind: 'progress'; value: number }
  | { kind: 'error'; message: string };
