import { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadZoneProps {
  onFilesAdd: (files: File[]) => void;
  hasFiles: boolean;
}

export function UploadZone({ onFilesAdd, hasFiles }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) onFilesAdd(files);
  }, [onFilesAdd]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onFilesAdd(files);
    e.target.value = '';
  }, [onFilesAdd]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
        isDragOver
          ? 'min-h-[200px] md:min-h-[220px] py-8'
          : hasFiles
          ? 'min-h-[140px] md:min-h-[160px] py-5'
          : 'min-h-[180px] md:min-h-[200px] py-8 md:py-10'
      }`}
      style={{
        borderColor: isDragOver ? 'var(--accent-primary)' : 'var(--border-color)',
        backgroundColor: isDragOver ? 'var(--accent-light)' : 'var(--bg-secondary)',
      }}
      onMouseEnter={(e) => { if (!isDragOver) e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
      onMouseLeave={(e) => { if (!isDragOver) e.currentTarget.style.borderColor = 'var(--border-color)'; }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.svg"
        onChange={handleInputChange}
        className="hidden"
      />
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{ backgroundColor: isDragOver ? 'var(--accent-light)' : 'var(--bg-tertiary)' }}
      >
        {hasFiles ? (
          <ImagePlus className="w-6 h-6" style={{ color: isDragOver ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
        ) : (
          <Upload className="w-6 h-6" style={{ color: isDragOver ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
        )}
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {hasFiles ? '继续添加图片文件' : '拖拽图片到此处，或点击上传'}
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          支持 JPG、PNG、WebP、GIF、SVG、AVIF 批量处理
        </p>
      </div>
      {!hasFiles && (
        <Button
          variant="default"
          size="sm"
          className="mt-1 h-9 text-[13px] font-medium rounded-xl px-5"
          style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          选择文件
        </Button>
      )}
    </div>
  );
}
