import type { AppSettings } from '@/types';
import { Modal } from './Modal';

export function SettingsPanel({ settings, onUpdate, onReset, onClose }: {
  settings: AppSettings;
  onUpdate: (settings: Partial<AppSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title="设置" onClose={onClose} className="settings-modal">
      <div className="modal-form">
        <label>外观<select value={settings.themeMode} onChange={event => onUpdate({ themeMode: event.target.value as AppSettings['themeMode'] })}>
          <option value="system">跟随系统</option><option value="light">浅色</option><option value="dark">深色</option>
        </select></label>
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
