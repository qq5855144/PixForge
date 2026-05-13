import { useState } from 'react';
import { FileText, Palette, Moon, Sun, Monitor, RotateCcw, ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { AppSettings, ThemeMode } from '@/types';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onUpdate: (partial: Partial<AppSettings>) => void;
  onReset: () => void;
}

const themeOptions: { id: ThemeMode; label: string; icon: typeof Moon }[] = [
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'system', label: '跟随系统', icon: Monitor },
];

export function SettingsPanel({ open, onOpenChange, settings, onUpdate, onReset }: SettingsPanelProps) {
  const [namingExpanded, setNamingExpanded] = useState(settings.outputNaming !== 'original');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[340px] p-0 flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)', borderLeftColor: 'var(--border-color)' }}
      >
        <SheetHeader
          className="px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <SheetTitle className="text-[16px] font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
            设置
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-5 p-5">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>外观主题</span>
            </div>
            <div className="flex gap-2">
              {themeOptions.map(({ id, label, icon: Icon }) => {
                const active = settings.themeMode === id;
                return (
                  <button
                    key={id}
                    onClick={() => onUpdate({ themeMode: id })}
                    className="flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] font-medium transition-all duration-200"
                    style={{
                      backgroundColor: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: active ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.8} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Naming rule */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <button onClick={() => setNamingExpanded(!namingExpanded)} className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>输出文件名规则</span>
              </div>
              <ChevronDown
                className="w-4 h-4 transition-transform duration-200"
                style={{ color: 'var(--text-muted)', transform: namingExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            <div className="flex flex-col gap-1 mt-3">
              {([
                { key: 'original', label: '保留原始文件名' },
                { key: 'suffix', label: '添加后缀 (_converted/_compressed)' },
                { key: 'rename', label: '重命名' },
              ] as const).map((option) => (
                <button
                  key={option.key}
                  onClick={() => onUpdate({ outputNaming: option.key })}
                  className="flex items-center gap-3 w-full text-left py-2.5 px-3 rounded-lg transition-all duration-150"
                  style={{
                    backgroundColor: settings.outputNaming === option.key ? 'var(--accent-light)' : 'transparent',
                    color: settings.outputNaming === option.key ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150"
                    style={{
                      borderColor: settings.outputNaming === option.key ? 'var(--accent-primary)' : 'var(--border-hover)',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    {settings.outputNaming === option.key && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                    )}
                  </div>
                  <span className="text-[13px]">{option.label}</span>
                </button>
              ))}

              {settings.outputNaming === 'rename' && (
                <div className="pl-7 mt-2 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={settings.renamePattern}
                    onChange={(e) => onUpdate({ renamePattern: e.target.value })}
                    placeholder="输入新文件名，如 processed"
                    className="w-full h-9 px-3 rounded-lg text-[13px] border-none outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    单文件：{settings.renamePattern || 'processed'}.png
                    <br />
                    批量：{settings.renamePattern || 'processed'}_1.png, {settings.renamePattern || 'processed'}_2.png ...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[12px] font-medium transition-all duration-200"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认设置
          </button>

          {/* Info */}
          <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              所有图片处理均在浏览器本地完成，文件不会上传到任何服务器，确保您的隐私安全。
            </p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>PixForge v2.1</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
