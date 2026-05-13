import { Crop, FileImage, Download, Scissors } from 'lucide-react';
import type { ProcessedFile } from '@/types';
import { formatFileSize } from '@/hooks/useImageProcessor';

interface CropPanelProps {
  files: ProcessedFile[];
  onCrop: (id: string) => void;
  onDownload: (id: string) => void;
}

export function CropPanel({ files, onCrop, onDownload }: CropPanelProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <FileImage className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="text-[15px] font-medium" style={{ color: 'var(--text-secondary)' }}>请先上传图片</p>
        <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>上传图片后即可进入裁剪工作区</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between h-11 rounded-xl px-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            共 <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{files.length}</span> 个文件
          </span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          点击裁剪按钮开始编辑
        </span>
      </div>

      {/* File grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {files.map((file) => {
          const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');
          if (isSvg) return null;

          const isCropped = file.status === 'completed' && file.name.includes('_cropped');

          return (
            <div
              key={file.id}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Thumbnail */}
              <div className="relative w-full aspect-[4/3]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  style={{ transform: `rotate(${file.rotation}deg)` }}
                />
                {isCropped && (
                  <div
                    className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--success)', color: '#fff' }}
                  >
                    已裁剪
                  </div>
                )}
                {file.rotation !== 0 && (
                  <div
                    className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                  >
                    {file.rotation}°
                  </div>
                )}
              </div>

              {/* Info & Actions */}
              <div className="p-3 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    {formatFileSize(file.size)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Download button - if cropped */}
                  {isCropped && (
                    <button
                      onClick={() => onDownload(file.id)}
                      className="h-8 px-3 rounded-lg text-[12px] font-medium flex items-center gap-1"
                      style={{ backgroundColor: 'var(--cyan-bg)', color: 'var(--cyan)' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      下载
                    </button>
                  )}

                  {/* Crop button */}
                  <button
                    onClick={() => onCrop(file.id)}
                    className="h-8 px-3 rounded-lg text-[12px] font-medium flex items-center gap-1"
                    style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                  >
                    <Crop className="w-3.5 h-3.5" />
                    {isCropped ? '重新裁剪' : '裁剪'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
