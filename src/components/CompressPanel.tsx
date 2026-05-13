import { useState, useMemo } from 'react';
import { Minimize2, ArrowRight, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { CompressSettings, ProcessedFile, TargetFormat } from '@/types';
import { formatFileSize } from '@/hooks/useImageProcessor';

interface CompressPanelProps {
  files: ProcessedFile[];
  isProcessing: boolean;
  globalProgress: number;
  onProcess: (settings: CompressSettings) => void;
  hasCompleted: boolean;
  onDownloadAll: () => void;
}

const FORMATS: { value: TargetFormat; label: string }[] = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
];

export function CompressPanel({
  files, isProcessing, globalProgress, onProcess, hasCompleted, onDownloadAll,
}: CompressPanelProps) {
  const [quality, setQuality] = useState([80]);
  const [maxSize, setMaxSize] = useState<number>(1920);
  const [enableMaxSize, setEnableMaxSize] = useState(false);
  const [keepFormat, setKeepFormat] = useState(true);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('jpeg');

  const hasPendingFiles = files.some(f => f.status === 'pending');
  const canProcess = files.length > 0 && (hasPendingFiles || isProcessing);

  const estimatedSize = useMemo(() => {
    if (files.length === 0) return null;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const q = quality[0] / 100;
    return Math.round(total * (0.3 + q * 0.4));
  }, [files, quality]);

  const reductionRatio = useMemo(() => {
    if (files.length === 0 || !estimatedSize) return null;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    return Math.round((1 - estimatedSize / total) * 100);
  }, [files, estimatedSize]);

  const handleProcess = () => {
    if (isProcessing) return;
    onProcess({
      quality: quality[0],
      maxWidth: enableMaxSize ? maxSize : undefined,
      maxHeight: enableMaxSize ? maxSize : undefined,
      keepFormat,
      targetFormat: keepFormat ? undefined : targetFormat,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quality */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Minimize2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>压缩质量</span>
          </div>
          <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-primary)' }}>{quality[0]}%</span>
        </div>
        <Slider value={quality} onValueChange={setQuality} min={1} max={100} step={1} className="w-full" />
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>高压缩 · 低画质</span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>低压缩 · 高画质</span>
        </div>
      </div>

      {/* Max dimension */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>尺寸限制</span>
          </div>
          <ToggleSwitch checked={enableMaxSize} onChange={setEnableMaxSize} />
        </div>
        {enableMaxSize ? (
          <div className="flex items-center gap-2">
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>最大边长</span>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              min={64}
              max={8192}
              className="w-24 h-8 px-3 rounded-lg text-[13px] font-mono border-none outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>px</span>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>保持原始尺寸</p>
        )}
      </div>

      {/* Format */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>输出格式</span>
          <div className="flex items-center gap-2">
            <ToggleSwitch checked={keepFormat} onChange={setKeepFormat} />
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>保持原格式</span>
          </div>
        </div>
        {!keepFormat && (
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
        )}
      </div>

      {/* Estimate */}
      {files.length > 0 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>预计体积变化</span>
            <span className="text-[13px] font-mono font-semibold" style={{ color: 'var(--cyan)' }}>
              {reductionRatio !== null ? `-${reductionRatio}%` : '计算中...'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>原始：{formatFileSize(files.reduce((s, f) => s + f.size, 0))}</span>
            <ArrowRight className="w-3 h-3" />
            <span>预计：{formatFileSize(estimatedSize || 0)}</span>
          </div>
        </div>
      )}

      {/* Action */}
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
                  压缩中 {globalProgress}%
                </span>
              ) : '开始批量压缩'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
      style={{ backgroundColor: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
        style={{
          left: checked ? 22 : 2,
          backgroundColor: '#fff',
          boxShadow: checked ? '0 2px 4px rgba(99,102,241,0.4)' : '0 2px 4px rgba(0,0,0,0.1)',
        }}
      />
    </button>
  );
}
