import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import type { ProcessedFile } from '@/types';

interface LightboxProps {
  files: ProcessedFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRotate?: (id: string, rotation: ProcessedFile['rotation']) => void;
}

export function Lightbox({ files, currentIndex, isOpen, onClose, onPrev, onNext, onRotate }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const currentFile = files[currentIndex];

  // Reset scale when image changes
  useEffect(() => {
    setScale(1);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'r' || e.key === 'R') {
        if (currentFile && onRotate) {
          const nextRot: Record<ProcessedFile['rotation'], ProcessedFile['rotation']> = {
            0: 90,
            90: 180,
            180: 270,
            270: 0,
          };
          onRotate(currentFile.id, nextRot[currentFile.rotation]);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, onPrev, onNext, currentFile, onRotate]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const zoomIn = useCallback(() => setScale(s => Math.min(s + 0.25, 3)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s - 0.25, 0.5)), []);
  const resetZoom = useCallback(() => setScale(1), []);

  const handleRotate = useCallback(() => {
    if (!currentFile || !onRotate) return;
    const nextRot: Record<ProcessedFile['rotation'], ProcessedFile['rotation']> = {
      0: 90,
      90: 180,
      180: 270,
      270: 0,
    };
    onRotate(currentFile.id, nextRot[currentFile.rotation]);
  }, [currentFile, onRotate]);

  if (!isOpen || !currentFile) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'var(--lightbox-bg)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150"
        style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation prev */}
      {files.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Navigation next */}
      {files.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-150"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Toolbar */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Zoom out */}
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--text-secondary)', opacity: scale <= 0.5 ? 0.3 : 1 }}
          disabled={scale <= 0.5}
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        {/* Scale display */}
        <span className="text-[11px] font-mono min-w-[44px] text-center" style={{ color: 'var(--text-secondary)' }}>
          {Math.round(scale * 100)}%
        </span>

        {/* Zoom in */}
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--text-secondary)', opacity: scale >= 3 ? 0.3 : 1 }}
          disabled={scale >= 3}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Reset zoom */}
        <button
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--text-secondary)' }}
          title="重置缩放 (1:1)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Rotate image */}
        <button
          onClick={(e) => { e.stopPropagation(); handleRotate(); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ color: 'var(--accent-primary)' }}
          title={`旋转 90° (当前 ${currentFile.rotation}°)`}
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Rotation badge */}
        {currentFile.rotation !== 0 && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}
          >
            {currentFile.rotation}°
          </span>
        )}

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border-color)' }} />

        {/* Counter */}
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {currentIndex + 1} / {files.length}
        </span>
      </div>

      {/* Image */}
      <div
        className="flex items-center justify-center w-full h-full p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentFile.previewUrl}
          alt={currentFile.name}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{
            transform: `scale(${scale}) rotate(${currentFile.rotation}deg)`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
          draggable={false}
        />
      </div>

      {/* Filename */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-[13px] font-medium" style={{ color: 'var(--lightbox-text)' }}>{currentFile.name}</p>
        <p className="text-[11px]" style={{ color: 'var(--lightbox-text-secondary)' }}>
          {formatFileSize(currentFile.size)}
          {currentFile.rotation !== 0 && (
            <span className="ml-2" style={{ color: 'var(--accent-primary)' }}>{currentFile.rotation}°</span>
          )}
        </p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
