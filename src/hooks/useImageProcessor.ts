import { useState, useCallback, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { toPng, toJpeg, toBlob } from 'html-to-image';
import type { ProcessedFile, TargetFormat, ConvertSettings, CompressSettings, AppSettings } from '@/types';

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getExtensionFromFormat(format: TargetFormat): string {
  const map: Record<TargetFormat, string> = {
    png: 'png',
    jpeg: 'jpg',
    webp: 'webp',
    gif: 'gif',
    avif: 'avif',
    svg: 'svg',
  };
  return map[format];
}

/** Apply naming rule to generate output filename */
function applyNamingRule(
  originalName: string,
  newExt: string,
  naming: AppSettings['outputNaming'],
  renamePattern: string,
  isCompress: boolean,
  fileIndex: number,
  totalFiles: number
): string {
  const base = originalName.replace(/\.[^.]+$/, '');
  const suffix = isCompress ? '_compressed' : '_converted';

  switch (naming) {
    case 'suffix':
      return `${base}${suffix}.${newExt}`;
    case 'rename': {
      const pattern = renamePattern.trim() || 'processed';
      if (totalFiles <= 1) {
        return `${pattern}.${newExt}`;
      }
      return `${pattern}_${fileIndex + 1}.${newExt}`;
    }
    case 'original':
    default:
      return `${base}.${newExt}`;
  }
}

/** Rotate image using canvas */
function rotateImage(
  img: HTMLImageElement,
  rotation: 0 | 90 | 180 | 270
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  if (rotation === 90 || rotation === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);
  ctx.restore();
  return canvas;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function convertImage(
  file: ProcessedFile,
  settings: ConvertSettings,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; format: string }> {
  const { targetFormat, quality } = settings;
  onProgress?.(10);

  if (targetFormat === 'svg') {
    if (file.type === 'image/svg+xml') {
      const blob = await fetch(file.previewUrl).then(r => r.blob());
      onProgress?.(100);
      return { blob, format: 'svg' };
    }
    const dataUrl = await fileToDataUrl(new File([await fetch(file.previewUrl).then(r => r.blob())], file.name));
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100"><image href="${dataUrl}" width="100" height="100"/></svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    onProgress?.(100);
    return { blob, format: 'svg' };
  }

  // SVG to bitmap conversion
  if (file.type === 'image/svg+xml') {
    onProgress?.(30);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    try {
      const svgText = await fetch(file.previewUrl).then(r => r.text());
      container.innerHTML = svgText;
      const svgEl = container.querySelector('svg') as SVGSVGElement;
      if (!svgEl) throw new Error('Invalid SVG');

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgRoot = doc.documentElement;
      let width = parseInt(svgRoot.getAttribute('width') || '800');
      let height = parseInt(svgRoot.getAttribute('height') || '600');
      const viewBox = svgRoot.getAttribute('viewBox');
      if (viewBox && (!width || !height)) {
        const parts = viewBox.split(/[\s,]+/);
        width = parseInt(parts[2]) || 800;
        height = parseInt(parts[3]) || 600;
      }
      if (!width || !height) { width = 800; height = 600; }

      svgEl.setAttribute('width', width.toString());
      svgEl.setAttribute('height', height.toString());
      svgEl.style.width = width + 'px';
      svgEl.style.height = height + 'px';
      container.appendChild(svgEl);
      onProgress?.(60);

      let dataUrl: string;
      const el = svgEl as unknown as HTMLElement;
      if (targetFormat === 'png') {
        dataUrl = await toPng(el, { quality: quality / 100 });
      } else if (targetFormat === 'jpeg') {
        dataUrl = await toJpeg(el, { quality: quality / 100, backgroundColor: '#ffffff' });
      } else {
        const b = await toBlob(el);
        if (!b) throw new Error('Conversion failed');
        onProgress?.(100);
        return { blob: b, format: targetFormat };
      }
      onProgress?.(80);
      const blob = await fetch(dataUrl).then(r => r.blob());
      onProgress?.(100);
      return { blob, format: targetFormat };
    } finally {
      document.body.removeChild(container);
    }
  }

  // Standard bitmap conversion using canvas
  onProgress?.(30);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = file.previewUrl;
  });
  onProgress?.(50);

  // Apply rotation if needed
  let canvas: HTMLCanvasElement;
  if (file.rotation !== 0) {
    canvas = rotateImage(img, file.rotation);
    onProgress?.(65);
  } else {
    canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  if (!file.rotation) {
    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
  } else if (targetFormat === 'jpeg') {
    // Fill white background for JPEG when rotated (already drawn in rotateImage)
    // But we need to ensure no transparent areas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);
    canvas = tempCanvas;
  }
  onProgress?.(70);

  const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : `image/${targetFormat}`;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => { if (b) resolve(b); else reject(new Error('Canvas conversion failed')); },
      mimeType,
      quality / 100
    );
  });
  onProgress?.(100);
  return { blob, format: targetFormat };
}

async function compressImage(
  file: ProcessedFile,
  settings: CompressSettings,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; format: string }> {
  const { quality, maxWidth, maxHeight, keepFormat, targetFormat } = settings;
  onProgress?.(10);

  const fetchBlob = await fetch(file.previewUrl).then(r => r.blob());
  const actualFile = new File([fetchBlob], file.name, { type: file.type });
  onProgress?.(30);

  const options: any = {
    maxSizeMB: Infinity,
    useWebWorker: true,
    fileType: keepFormat ? file.type : `image/${targetFormat || 'jpeg'}`,
    initialQuality: quality / 100,
  };

  if (maxWidth || maxHeight) {
    options.maxWidthOrHeight = Math.max(maxWidth || 0, maxHeight || 0) || undefined;
  }

  onProgress?.(50);
  const compressedBlob = await imageCompression(actualFile, options);
  onProgress?.(80);

  // Apply rotation if needed
  if (file.rotation !== 0) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(compressedBlob);
    });
    const rotatedCanvas = rotateImage(img, file.rotation);
    URL.revokeObjectURL(img.src);

    const mimeType = keepFormat
      ? file.type
      : `image/${targetFormat || 'jpeg'}`;
    const rotatedBlob = await new Promise<Blob>((resolve, reject) => {
      rotatedCanvas.toBlob(
        (b) => { if (b) resolve(b); else reject(new Error('Rotation failed')); },
        mimeType,
        0.95
      );
    });
    onProgress?.(100);
    const format = keepFormat ? file.type.split('/')[1] || 'jpg' : targetFormat || 'jpg';
    return { blob: rotatedBlob, format };
  }

  onProgress?.(100);
  const format = keepFormat ? file.type.split('/')[1] || 'jpg' : targetFormat || 'jpg';
  return { blob: compressedBlob, format };
}

export function useImageProcessor(appSettings: AppSettings) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const abortRef = useRef(false);

  const addFiles = useCallback(async (newFiles: File[]) => {
    const processed: ProcessedFile[] = [];
    for (const file of newFiles.slice(0, 100)) {
      if (!file.type.startsWith('image/') && !file.name.endsWith('.svg')) continue;
      const previewUrl = URL.createObjectURL(file);
      processed.push({
        id: generateId(),
        name: file.name,
        originalName: file.name,
        size: file.size,
        type: file.type || 'image/svg+xml',
        previewUrl,
        status: 'pending',
        rotation: 0,
        progress: 0,
      });
    }
    setFiles(prev => [...prev, ...processed]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      if (file?.result?.url) URL.revokeObjectURL(file.result.url);
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.result?.url) URL.revokeObjectURL(f.result.url);
      });
      return [];
    });
  }, []);

  /** Move file from one index to another (drag sort) */
  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFiles(prev => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  /** Set rotation for a specific file */
  const setRotation = useCallback((id: string, rotation: ProcessedFile['rotation']) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, rotation, status: f.status === 'completed' ? 'pending' : f.status } : f))
    );
  }, []);

  /** Apply a cropped image to a file, replacing its preview */
  const cropFile = useCallback((id: string, croppedBlob: Blob) => {
    setFiles(prev =>
      prev.map(f => {
        if (f.id !== id) return f;
        // Revoke old preview URL
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        const newPreviewUrl = URL.createObjectURL(croppedBlob);
        const newResultUrl = URL.createObjectURL(croppedBlob);
        const baseName = f.originalName.replace(/\.[^.]+$/, '');
        const newName = `${baseName}_cropped.${f.type.split('/')[1] || 'jpg'}`;
        return {
          ...f,
          name: newName,
          previewUrl: newPreviewUrl,
          size: croppedBlob.size,
          status: 'completed',
          rotation: 0,
          result: {
            blob: croppedBlob,
            url: newResultUrl,
            size: croppedBlob.size,
            format: f.type.split('/')[1] || 'jpg',
          },
          progress: 100,
        };
      })
    );
  }, []);

  const processConvert = useCallback(async (settings: ConvertSettings) => {
    if (files.length === 0) return;
    abortRef.current = false;
    setIsProcessing(true);
    setGlobalProgress(0);

    const pendingFiles = files.filter(f => f.status === 'pending');
    const total = pendingFiles.length;

    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;
      const file = pendingFiles[i];

      setFiles(prev =>
        prev.map(f => f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f)
      );

      try {
        const onProgress = (p: number) => {
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: p } : f));
        };

        const result = await convertImage(file, settings, onProgress);
        const url = URL.createObjectURL(result.blob);
        const newExt = getExtensionFromFormat(result.format as TargetFormat);
        const newName = applyNamingRule(
          file.originalName,
          newExt,
          appSettings.outputNaming,
          appSettings.renamePattern,
          false,
          i,
          total
        );

        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  name: newName,
                  result: {
                    blob: result.blob,
                    url,
                    size: result.blob.size,
                    format: result.format,
                  },
                }
              : f
          )
        );
      } catch (err) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : '处理失败' }
              : f
          )
        );
      }

      setGlobalProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsProcessing(false);
  }, [files, appSettings]);

  const processCompress = useCallback(async (settings: CompressSettings) => {
    if (files.length === 0) return;
    abortRef.current = false;
    setIsProcessing(true);
    setGlobalProgress(0);

    const pendingFiles = files.filter(f => f.status === 'pending');
    const total = pendingFiles.length;

    for (let i = 0; i < total; i++) {
      if (abortRef.current) break;
      const file = pendingFiles[i];

      setFiles(prev =>
        prev.map(f => f.id === file.id ? { ...f, status: 'processing', progress: 0 } : f)
      );

      try {
        const onProgress = (p: number) => {
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress: p } : f));
        };

        const result = await compressImage(file, settings, onProgress);
        const url = URL.createObjectURL(result.blob);
        const ext = getExtensionFromFormat(result.format as TargetFormat);
        const newName = applyNamingRule(
          file.originalName,
          ext,
          appSettings.outputNaming,
          appSettings.renamePattern,
          true,
          i,
          total
        );

        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'completed',
                  progress: 100,
                  name: newName,
                  result: {
                    blob: result.blob,
                    url,
                    size: result.blob.size,
                    format: result.format,
                  },
                }
              : f
          )
        );
      } catch (err) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : '处理失败' }
              : f
          )
        );
      }

      setGlobalProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsProcessing(false);
  }, [files, appSettings]);

  const downloadFile = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    if (!file?.result) return;
    const a = document.createElement('a');
    a.href = file.result.url;
    a.download = file.name;
    a.click();
  }, [files]);

  const downloadAll = useCallback(async () => {
    const completed = files.filter(f => f.status === 'completed' && f.result);
    if (completed.length === 0) return;

    if (completed.length === 1) {
      downloadFile(completed[0].id);
      return;
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    completed.forEach(file => {
      if (file.result) {
        zip.file(file.name, file.result.blob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixforge_processed.zip';
    a.click();
    URL.revokeObjectURL(url);
  }, [files, downloadFile]);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const completedCount = files.filter(f => f.status === 'completed').length;
  const hasCompleted = completedCount > 0;
  const allCompleted = files.length > 0 && files.every(f => f.status === 'completed');

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    moveFile,
    setRotation,
    cropFile,
    processConvert,
    processCompress,
    downloadFile,
    downloadAll,
    isProcessing,
    globalProgress,
    totalSize,
    completedCount,
    hasCompleted,
    allCompleted,
  };
}

export { formatFileSize };
