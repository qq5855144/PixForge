import { useState, useMemo } from 'react';
import { Shuffle, ArrowRight, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { ConvertSettings, ProcessedFile } from '@/types';
import { formatFileSize } from '@/hooks/useImageProcessor';

interface ConvertPanelProps {
  files: ProcessedFile[];
  isProcessing: boolean;
  globalProgress: number;
  onProcess: (settings: ConvertSettings) => void;
  hasCompleted: boolean;
  onDownloadAll: () => void;
}

const FORMATS: { value: ConvertSettings['targetFormat']; label: string }[] = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'webp', label: 'WebP' },
  { value: 'gif', label: 'GIF' },
  { value: 'avif', label: 'AVIF' },
  { value: 'svg', label: 'SVG' },
];

export function ConvertPanel({
  files, isProcessing, globalProgress, onProcess, hasCompleted, onDownloadAll,
}: ConvertPanelProps) {
  const [targetFormat, setTargetFormat] = useState<ConvertSettings['targetFormat']>('webp');
  const [quality, setQuality] = useState([90]);

  const hasPendingFiles = files.some(f => f.status === 'pending');
  const canProcess = files.length > 0 && (hasPendingFiles || isProcessing);

  const estimatedSize = useMemo(() => {
    if (files.length === 0) return null;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const formatRatio: Record<string, number> = { png: 0.8, jpeg: 0.5, webp: 0.4, gif: 0.9, avif: 0.3, svg: 0.3 };
    const q = quality[0] / 100;
    return Math.round(total * (formatRatio[targetFormat] || 0.5) * (0.5 + q * 0.5));
  }, [files, targetFormat, quality]);

  const handleProcess = () => {
    if (isProcessing) return;
    onProcess({ targetFormat, quality: quality[0] });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Target format */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Shuffle className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>目标格式</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map(({ value, label }) => {
            const active = targetFormat === value;
            return (
              <button
                key={value}
                onClick={() => setTargetFormat(value)}
                className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
                style={{
                  backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  boxShadow: active ? '0 4px 12px var(--accent-glow)' : 'none',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality slider */}
      {(targetFormat === 'jpeg' || targetFormat === 'webp' || targetFormat === 'avif') && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>输出质量</span>
            </div>
            <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{quality[0]}%</span>
          </div>
          <Slider value={quality} onValueChange={setQuality} min={1} max={100} step={1} className="w-full" />
          <div className="flex justify-between mt-2">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>低画质 · 小体积</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>高画质 · 大体积</span>
          </div>
        </div>
      )}

      {/* Size estimate */}
      {files.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>预计输出体积</span>
            <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--cyan)' }}>
              {formatFileSize(estimatedSize || 0)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>原始：{formatFileSize(files.reduce((s, f) => s + f.size, 0))}</span>
            <ArrowRight className="w-3 h-3" />
            <span>转换后：{formatFileSize(estimatedSize || 0)}</span>
          </div>
        </div>
      )}

      {/* Action button */}
      {files.length > 0 && (
        <div className="sticky bottom-0 pt-2 pb-1" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {hasCompleted && !isProcessing ? (
            <Button
              onClick={onDownloadAll}
              className="w-full h-12 font-semibold rounded-xl text-[14px]"
              style={{ backgroundColor: 'var(--cyan)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px var(--cyan-bg)' }}
            >
              全部下载
            </Button>
          ) : (
            <Button
              onClick={handleProcess}
              disabled={!canProcess}
              className="w-full h-12 font-semibold rounded-xl text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#fff', boxShadow: '0 4px 20px var(--accent-glow)' }}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  转换中 {globalProgress}%
                </span>
              ) : '开始批量转换'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
