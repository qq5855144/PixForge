import { Monitor, Moon, Sun } from 'lucide-react';
import type { AppSettings } from '@/types';
import { Modal } from './Modal';

const themes = [
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'system', label: '跟随系统', icon: Monitor },
] as const;

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: {
  settings: AppSettings;
  onUpdate: (settings: Partial<AppSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="设置" onClose={onClose} className="preferences-modal">
      <div className="modal-form">
        <fieldset className="theme-options">
          <legend>外观主题</legend>
          {themes.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className="mini-button" aria-pressed={settings.themeMode === id}
              onClick={() => onUpdate({ themeMode: id })}><Icon size={19} />{label}</button>
          ))}
        </fieldset>
        <label>输出命名<select value={settings.outputNaming} onChange={event => onUpdate({ outputNaming: event.target.value as AppSettings['outputNaming'] })}>
          <option value="original">使用原文件名</option><option value="suffix">添加操作后缀</option><option value="rename">统一命名</option>
        </select></label>
        {settings.outputNaming === 'rename' && <label>文件名<input type="text" maxLength={100} value={settings.renamePattern}
          onChange={event => onUpdate({ renamePattern: event.target.value })} /></label>}
        <button type="button" className="button" onClick={onReset}>恢复默认设置</button>
      </div>
    </Modal>
  );
}
