import { BookmarkPlus, ChevronDown, ImageDown } from 'lucide-react';
import { FORMATS, MAX_DIMENSION } from '@/image/formats';
import type { AppMode, Format, OutputSettings, Preset } from '@/types';

export function OutputPanel({ mode, options, onChange, webp, locked, presets, activePreset,
  onPreset, onSavePreset, onDeletePreset }: {
  mode: AppMode;
  options: OutputSettings;
  onChange: (settings: Partial<OutputSettings>) => void;
  webp: boolean;
  locked: boolean;
  presets: Preset[];
  activePreset: string;
  onPreset: (id: string) => void;
  onSavePreset: () => void;
  onDeletePreset: () => void;
}) {
  const formats: Array<Format | 'original'> = ['original', 'jpeg', 'png', 'webp', 'avif', 'gif', 'svg'];
  const quality = options.format === 'original' || ['jpeg', 'webp', 'avif'].includes(options.format);
  const numeric = (value: string) => value ? Number(value) : undefined;
  return (
    <aside className="parameters" aria-label="输出设置">
      <fieldset className="panel-fieldset" disabled={locked}>
        <legend className="panel-title"><ImageDown size={17} /> 输出设置</legend>
        <div className="panel-body">
          <div className="preset-row">
            <label className="preset-select"><span className="sr-only">预设</span>
              <select aria-label="预设" value={activePreset} onChange={event => onPreset(event.target.value)}>
                <option value="">选择预设</option>
                {presets.map(preset => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
              </select>
            </label>
            <button className="icon-button" onClick={onSavePreset} aria-label="保存为预设" title="保存为预设"><BookmarkPlus size={19} /></button>
          </div>
          {activePreset && presets.find(preset => preset.id === activePreset)?.id.startsWith('user-') &&
            <button className="text-button" onClick={onDeletePreset}>删除此预设</button>}
          <div className="parameter">
            <span className="parameter-label">格式</span>
            <div className="format-choices">
              {formats.map(format => <button className="mini-button" key={format} type="button"
                disabled={format === 'webp' && !webp} aria-pressed={options.format === format}
                onClick={() => onChange({ format })}>{format === 'original' ? '原格式' : FORMATS[format].label}</button>)}
            </div>
            {options.format === 'svg' && <small>位图将嵌入 SVG，保留原始比例。</small>}
          </div>
          {quality && <label className="range-row parameter">
            <span className="parameter-label">质量</span><input type="range" min="1" max="100" value={options.quality}
              onChange={event => onChange({ quality: Number(event.target.value) })} /><output>{options.quality}%</output>
          </label>}
          {mode === 'compress' && <label className="limit-row">
            <span className="parameter-label">目标体积</span><input type="number" inputMode="numeric" min="1" max="524288"
              placeholder="不限" value={options.targetKB ?? ''} onChange={event => onChange({ targetKB: numeric(event.target.value) })} /><span>KB</span>
          </label>}
          {mode === 'crop' && <label className="limit-row">
            <span className="parameter-label">批量裁剪</span><select value={options.cropAspect || ''} onChange={event => onChange({ cropAspect: numeric(event.target.value) })}>
              <option value="">手动／原比例</option><option value="1">居中 1:1</option><option value={4/3}>居中 4:3</option>
              <option value={16/9}>居中 16:9</option><option value={9/16}>居中 9:16</option>
            </select>
          </label>}
          <details className="advanced" open={mode === 'crop' ? true : undefined}>
            <summary>尺寸与更多选项 <ChevronDown size={16} /></summary>
            <div className="advanced-fields">
              <div className="size-fields">
                <label>宽度 <input type="number" min="1" max={MAX_DIMENSION} inputMode="numeric" placeholder="自动"
                  value={options.width ?? ''} onChange={event => onChange({ width: numeric(event.target.value) })} /></label>
                <label>高度 <input type="number" min="1" max={MAX_DIMENSION} inputMode="numeric" placeholder="自动"
                  value={options.height ?? ''} onChange={event => onChange({ height: numeric(event.target.value) })} /></label>
              </div>
              <label className="check-field"><input type="checkbox" checked={options.keepAspect}
                onChange={event => onChange({ keepAspect: event.target.checked })} />保持宽高比</label>
              <label>动画图片<select value={options.preserveAnimation ? 'preserve' : 'first'}
                onChange={event => onChange({ preserveAnimation: event.target.value === 'preserve' })}>
                <option value="preserve">保留动画（原格式或 GIF）</option><option value="first">提取首帧</option>
              </select></label>
              {['original', 'jpeg'].includes(options.format) && <label className="check-field"><input type="checkbox" checked={options.preserveExif}
                onChange={event => onChange({ preserveExif: event.target.checked })} />保留 JPEG EXIF（含定位）</label>}
            </div>
          </details>
        </div>
      </fieldset>
    </aside>
  );
}
