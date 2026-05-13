import { useState } from 'react';
import { Trash2, X, Download, CheckCircle2, AlertCircle, Loader2, FileImage, GripVertical, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProcessedFile } from '@/types';
import { formatFileSize } from '@/hooks/useImageProcessor';

interface FileListProps {
  files: ProcessedFile[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onDownload: (id: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onRotate: (id: string, rotation: ProcessedFile['rotation']) => void;
  onPreview: (index: number) => void;
}

export function FileList({ files, onRemove, onClear, onDownload, onMove, onRotate, onPreview }: FileListProps) {
  if (files.length === 0) return null;
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    onMove(dragIndex, index);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between h-11 rounded-xl px-3 md:px-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            已选择 <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{files.length}</span> 个文件
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>· {formatFileSize(totalSize)}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-7 text-[11px] rounded-lg gap-1 px-2"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          清空
        </Button>
      </div>

      {/* File cards */}
      <div className="flex flex-col gap-2">
        {files.map((file, index) => (
          <div
            key={file.id}
            draggable={!file.status.includes('processing')}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-200 ${
              dragIndex === index ? 'opacity-50' : ''
            } ${dragOverIndex === index && dragOverIndex !== dragIndex ? 'scale-[1.02]' : ''}`}
            style={{
              backgroundColor: dragOverIndex === index && dragOverIndex !== dragIndex ? 'var(--bg-hover)' : 'var(--bg-secondary)',
              borderLeft: file.status === 'completed' ? '3px solid var(--accent-primary)' : '3px solid transparent',
              cursor: dragIndex === index ? 'grabbing' : 'grab',
            }}
            onMouseEnter={(e) => { if (dragIndex === null) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
          >
            <FileCard
              file={file}
              onRemove={() => onRemove(file.id)}
              onDownload={() => onDownload(file.id)}
              onRotate={(rot) => onRotate(file.id, rot)}
              onPreview={() => onPreview(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FileCard({
  file,
  onRemove,
  onDownload,
  onRotate,
  onPreview,
}: {
  file: ProcessedFile;
  onRemove: () => void;
  onDownload: () => void;
  onRotate: (rotation: ProcessedFile['rotation']) => void;
  onPreview: () => void;
}) {
  const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
  const isCompleted = file.status === 'completed';
  const isError = file.status === 'error';
  const isProcessing = file.status === 'processing';
  const isPending = file.status === 'pending';

  const compressionRatio = isCompleted && file.result
    ? Math.round((1 - file.result.size / file.size) * 100)
    : null;

  const nextRotation: Record<ProcessedFile['rotation'], ProcessedFile['rotation']> = {
    0: 90,
    90: 180,
    180: 270,
    270: 0,
  };

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Drag handle */}
      <div className="flex-shrink-0 cursor-grab active:cursor-grabbing" style={{ color: 'var(--text-muted)' }}>
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Thumbnail - clickable for preview */}
      <button
        onClick={onPreview}
        className="relative w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center transition-opacity duration-150 hover:opacity-80"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {isSvg && !file.previewUrl ? (
          <FileImage className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
        ) : (
          <img
            src={file.previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{
              transform: `rotate(${file.rotation}deg)`,
            }}
          />
        )}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          </div>
        )}
        {/* Rotation badge */}
        {file.rotation !== 0 && isPending && (
          <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
            {file.rotation}°
          </div>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate max-w-[180px] md:max-w-[260px]" style={{ color: 'var(--text-primary)' }}>
          {file.name}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {file.type.split('/')[1]?.toUpperCase() || 'SVG'} · {formatFileSize(file.size)}
          {file.rotation !== 0 && <span className="ml-1" style={{ color: 'var(--accent-primary)' }}>({file.rotation}°)</span>}
        </p>
        {isCompleted && file.result && (
          <p className="text-[11px] mt-0.5 font-mono" style={{ color: 'var(--cyan)' }}>
            → {formatFileSize(file.result.size)}
            {compressionRatio !== null && compressionRatio > 0 && (
              <span className="ml-1" style={{ color: 'var(--success)' }}>(-{compressionRatio}%)</span>
            )}
          </p>
        )}
        {isError && <p className="text-[11px] mt-0.5" style={{ color: 'var(--error)' }}>{file.error}</p>}
        {isProcessing && (
          <div className="mt-1.5">
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-300 relative"
                style={{ width: `${file.progress}%`, backgroundColor: 'var(--accent-primary)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Rotate button - only for pending files */}
        {isPending && !isSvg && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRotate(nextRotation[file.rotation])}
            className="w-7 h-7 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            title="旋转"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        )}

        {isCompleted && (
          <>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-1" style={{ backgroundColor: 'var(--success-bg)' }}>
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownload}
              className="w-7 h-7 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cyan)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <Download className="w-4 h-4" />
            </Button>
          </>
        )}
        {isError && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-1" style={{ backgroundColor: 'var(--error-bg)' }}>
            <AlertCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="w-7 h-7 rounded-lg"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
