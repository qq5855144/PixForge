export type AppMode = 'convert' | 'compress' | 'crop';
export type Format = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif' | 'svg';
export type Rotation = 0 | 90 | 180 | 270;
export type CropShape = 'rect' | 'round';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropEdit {
  region: Region;
  aspect?: number;
  shape: CropShape;
  radius: number;
}

export interface Edits {
  rotation: Rotation;
  crop?: CropEdit;
}

export interface OutputSettings {
  format: Format | 'original';
  quality: number;
  targetKB?: number;
  cropAspect?: number;
  width?: number;
  height?: number;
  keepAspect: boolean;
  preserveAnimation: boolean;
  preserveExif: boolean;
}

export interface ImageInfo {
  width: number;
  height: number;
  animated: boolean;
  format?: Format;
}

export interface ImageOutput {
  blob: Blob;
  format: Format;
  width: number;
  height: number;
  animated: boolean;
}

export interface ImageResult extends ImageOutput {
  name: string;
  url: string;
}

export interface ImageItem {
  id: string;
  source: File;
  thumbnail?: string;
  info?: ImageInfo;
  edits: Edits;
  undo?: Edits;
  excluded?: boolean;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ImageResult;
  error?: string;
}

export interface AppSettings {
  outputNaming: 'original' | 'suffix' | 'rename';
  renamePattern: string;
  themeMode: ThemeMode;
}

export interface Preset {
  id: string;
  label: string;
  mode: AppMode;
  settings: OutputSettings;
}
