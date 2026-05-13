import { useState, useCallback } from 'react';
import { X, Check, Square, Circle, ImageIcon, Move } from 'lucide-react';
import { CustomCropper, generateCroppedBlob } from './CustomCropper';
import type { CropSettings, CropShape } from '@/types';

interface CropBox { x: number; y: number; width: number; height: number; }

interface CropModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob, settings: CropSettings) => void;
}

const RATIOS: { label: string; value?: number }[] = [
  { label: '自由' },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

export function CropModal({ imageUrl, isOpen, onClose, onConfirm }: CropModalProps) {
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [shape, setShape] = useState<CropShape>('rect');
  const [borderRadius, setBorderRadius] = useState(0);
  const [outW, setOutW] = useState('');
  const [outH, setOutH] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((box: CropBox) => setCrop(box), []);

  const handleConfirm = async () => {
    if (crop.width <= 0 || crop.height <= 0) return;
    setIsProcessing(true);
    try {
      const blob = await generateCroppedBlob(
        imageUrl, crop, shape, borderRadius,
        outW ? parseInt(outW) : undefined,
        outH ? parseInt(outH) : undefined
      );
      onConfirm(blob, {
        aspect, shape, borderRadius,
        outputWidth: outW ? parseInt(outW) : undefined,
        outputHeight: outH ? parseInt(outH) : undefined,
        maintainAspect: true,
      });
      reset();
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
    setAspect(undefined);
    setShape('rect');
    setBorderRadius(0);
    setOutW(''); setOutH('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleAspect = (val: number | undefined) => {
    setAspect(val);
    // Cropper will auto-fit initial crop when aspect changes via its internal logic
  };

  const handleShape = (s: CropShape) => {
    setShape(s);
    if (s === 'round') setBorderRadius(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>

      {/* ---- Header ---- */}
      <div className="h-12 flex items-center justify-between px-3 flex-shrink-0" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={handleClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <X className="w-5 h-5" />
        </button>
        <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>裁剪</span>
        <button
          onClick={handleConfirm}
          disabled={isProcessing || crop.width <= 0}
          className="h-8 px-4 rounded-lg text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-40"
          style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
        >
          {isProcessing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
          确认
        </button>
      </div>

      {/* ---- Canvas ---- */}
      <div className="flex-1 relative min-h-0">
        <CustomCropper
          imageUrl={imageUrl}
          aspect={aspect}
          shape={shape}
          borderRadiusPercent={borderRadius}
          onCropChange={onCropChange}
        />
      </div>

      {/* ---- Bottom toolbar ---- */}
      <div className="flex-shrink-0 px-3 pt-2 pb-3 md:pb-2 flex flex-col gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>

        {/* Hint */}
        <div className="flex items-center gap-1.5 px-1">
          <Move className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>拖动框内移动，拖动边框/角点调整大小</span>
        </div>

        {/* Row 1: Shape + Ratios */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Shape toggle */}
          <button
            onClick={() => handleShape(shape === 'rect' ? 'round' : 'rect')}
            className="h-7 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium flex-shrink-0"
            style={{
              backgroundColor: shape === 'round' ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              color: shape === 'round' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            {shape === 'round' ? <Circle className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            {shape === 'round' ? '圆形' : '矩形'}
          </button>

          <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: 'var(--border-color)' }} />

          {/* Ratios */}
          {RATIOS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleAspect(value)}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex-shrink-0 transition-all duration-150"
              style={{
                backgroundColor: aspect === value ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: aspect === value ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 2: Border radius + Output size */}
        <div className="flex items-center gap-4">
          {shape === 'rect' && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>圆角</span>
              <input
                type="range"
                min={0} max={100} value={borderRadius}
                onChange={(e) => setBorderRadius(Number(e.target.value))}
                className="flex-1 min-w-0 h-1 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${borderRadius}%, var(--thumb-track) ${borderRadius}%, var(--thumb-track) 100%)`,
                }}
              />
              <span className="text-[11px] font-mono w-6 text-right flex-shrink-0" style={{ color: 'var(--accent-primary)' }}>{borderRadius}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ImageIcon className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <input
              type="number" placeholder="宽" value={outW}
              onChange={(e) => setOutW(e.target.value)}
              className="w-14 h-7 px-1.5 rounded-md text-[11px] font-mono text-center border-none outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>×</span>
            <input
              type="number" placeholder="高" value={outH}
              onChange={(e) => setOutH(e.target.value)}
              className="w-14 h-7 px-1.5 rounded-md text-[11px] font-mono text-center border-none outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
