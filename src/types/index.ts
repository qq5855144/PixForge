export interface ProcessedFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  rotation: 0 | 90 | 180 | 270;
  result?: {
    blob: Blob;
    url: string;
    size: number;
    format: string;
  };
  progress: number;
  error?: string;
}

export type AppMode = 'convert' | 'compress' | 'crop';

export type TargetFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'avif' | 'svg';

export interface ConvertSettings {
  targetFormat: TargetFormat;
  quality: number;
}

export interface CompressSettings {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  keepFormat: boolean;
  targetFormat?: TargetFormat;
}

export type CropShape = 'rect' | 'round';

export interface CropSettings {
  aspect?: number;
  shape: CropShape;
  borderRadius: number;
  outputWidth?: number;
  outputHeight?: number;
  maintainAspect: boolean;
}

export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  outputNaming: 'original' | 'suffix' | 'rename';
  renamePattern: string;
  themeMode: ThemeMode;
}
