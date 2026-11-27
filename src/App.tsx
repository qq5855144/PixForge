import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { Clipboard, Crop, Download, FolderOpen, Hexagon, ImagePlus, Minimize2,
  Settings, Share2, Shuffle, Square, Trash2 } from 'lucide-react';
import { FileList } from '@/components/FileList';
import { Modal } from '@/components/Modal';
import { OutputPanel } from '@/components/OutputPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { androidApp, exportFiles, listenForAndroidImports } from '@/image/exports';
import { formatBytes, MAX_DIMENSION, MAX_FILES } from '@/image/formats';
import { BUILTIN_PRESETS, MODE_LABELS, initialOutput, loadPresets, storePresets } from '@/image/presets';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import type { AppMode, ImageItem, ImageResult, OutputSettings, Preset } from '@/types';

const CropModal = lazy(() => import('@/components/CropModal'));
const PreviewModal = lazy(() => import('@/components/PreviewModal'));
const modes = [
  { id: 'convert', icon: Shuffle }, { id: 'compress', icon: Minimize2 }, { id: 'crop', icon: Crop },
] as const;

function canWebp() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp;');
  } catch { return false; }
}

function validOptions(options: OutputSettings) {
  return [options.width, options.height].every(value =>
    value === undefined || (Number.isInteger(value) && value >= 1 && value <= MAX_DIMENSION)) &&
    (options.targetKB === undefined || (Number.isFinite(options.targetKB) && options.targetKB >= 1 && options.targetKB <= 524288));
}

export default function App() {
  const [webp] = useState(canWebp);
  const [mode, setMode] = useState<AppMode>('convert');
  const [output, setOutput] = useState<Record<AppMode, OutputSettings>>(() => ({
    convert: initialOutput('convert', webp), compress: initialOutput('compress', webp), crop: initialOutput('crop', webp),
  }));
  const [presets, setPresets] = useState(loadPresets);
  const [activePreset, setActivePreset] = useState('');
  const [presetDialog, setPresetDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [clearDialog, setClearDialog] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const [cropId, setCropId] = useState<string>();
  const [notice, setNotice] = useState('');
  const [exportProgress, setExportProgress] = useState<number>();
  const [dragOver, setDragOver] = useState(false);
  const importing = useRef<HTMLInputElement>(null);
  const exporting = useRef(false);
  const dragDepth = useRef(0);
  const pickerAvailable = typeof (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function';

  const { settings, updateSettings, resetSettings } = useAppSettings();
  const { items, batch, add, remove, changeEdits, move, reorder, toggle, process, stop, invalidate } = useImageProcessor();
  const locked = Boolean(batch) || exportProgress !== undefined;
  const options = output[mode];
  const eligible = items.filter(item => !item.excluded);
  const ready = eligible.some(item => item.status !== 'completed');
  const completed = items.flatMap(item => !item.excluded && item.result ? [item.result] : []);
  const errors = eligible.filter(item => item.status === 'error').length;
  const preview = items.find(item => item.id === previewId);
  const crop = items.find(item => item.id === cropId);
  const allPresets = useMemo(() => [...BUILTIN_PRESETS, ...presets], [presets]);

  const importFiles = useCallback((files: File[], externalErrors = 0) => {
    const { added, rejected } = add(files);
    const skipped = rejected + externalErrors;
    if (skipped) setNotice(`已添加 ${added} 张，${skipped} 张无法导入。只接受图片，最多 ${MAX_FILES} 张、每张 100 MB。`);
    else if (added) setNotice(`已添加 ${added} 张图片`);
  }, [add]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length) {
        event.preventDefault();
        importFiles(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [importFiles]);

  useEffect(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    listenForAndroidImports(importFiles, controller.signal).then(stop => {
      if (controller.signal.aborted) stop();
      else dispose = stop;
    }).catch(() => { if (!controller.signal.aborted) setNotice('无法连接系统分享导入'); });
    return () => { controller.abort(); dispose?.(); };
  }, [importFiles]);

  function changeMode(next: AppMode) {
    if (next === mode || locked) return;
    setMode(next);
    setActivePreset('');
    invalidate();
  }

  function changeOptions(next: Partial<OutputSettings>) {
    setOutput(value => ({ ...value, [mode]: { ...value[mode], ...next } }));
    setActivePreset('');
    invalidate();
  }

  function applyPreset(id: string) {
    setActivePreset(id);
    const preset = allPresets.find(entry => entry.id === id);
    if (!preset) return;
    setOutput(value => ({ ...value, [preset.mode]: {
      ...preset.settings, format: preset.settings.format === 'webp' && !webp ? 'png' : preset.settings.format,
    } }));
    setMode(preset.mode);
    invalidate();
  }

  function updatePresets(next: Preset[]) {
    try {
      storePresets(next);
      setPresets(next);
      return true;
    } catch {
      setNotice('无法保存预设，请检查浏览器存储权限');
      return false;
    }
  }

  function savePreset(event: FormEvent) {
    event.preventDefault();
    const label = presetName.trim();
    if (!label || !validOptions(options)) return;
    if (presets.length >= 20) { setNotice('最多保存 20 个自定义预设'); setPresetDialog(false); return; }
    const preset = { id: `user-${crypto.randomUUID()}`, mode, label, settings: { ...options } };
    if (updatePresets([...presets, preset])) {
      setActivePreset(preset.id);
      setPresetDialog(false);
      setNotice('已保存预设');
    }
  }

  async function paste() {
    try {
      const entries = await navigator.clipboard.read();
      const files: File[] = [];
      for (const entry of entries) {
        const type = entry.types.find(type => type.startsWith('image/'));
        if (type) {
          const blob = await entry.getType(type);
          files.push(new File([blob], `剪贴板-${Date.now()}-${files.length + 1}.${type === 'image/svg+xml' ? 'svg' : type.split('/')[1]}`, { type }));
        }
      }
      if (files.length) importFiles(files);
      else setNotice('剪贴板中没有图片');
    } catch { setNotice('可在工作区按 Ctrl+V 或 ⌘+V 粘贴图片'); }
  }

  const download = useCallback(async (files: ImageResult[], share = false, saveAs = false) => {
    if (exporting.current || !files.length) return;
    exporting.current = true;
    setExportProgress(0);
    try {
      const done = await exportFiles(files, share, setExportProgress, saveAs);
      setNotice(done ? share ? '已打开分享面板' : '已提交导出' : '已取消保存');
    } catch (error) {
      setNotice(error instanceof DOMException && error.name === 'AbortError' ? '已取消导出' :
        error instanceof Error ? error.message : '无法导出文件');
    } finally {
      setExportProgress(undefined);
      exporting.current = false;
    }
  }, []);

  const downloadOne = useCallback((item: ImageItem) => {
    if (item.result) void download([item.result]);
  }, [download]);

  const rowActions = useMemo(() => ({
    remove, move, reorder, edit: changeEdits, toggle, preview: setPreviewId, crop: setCropId, download: downloadOne,
  }), [remove, move, reorder, changeEdits, toggle, downloadOne]);

  function drop(event: DragEvent) {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    dragDepth.current = 0;
    setDragOver(false);
    importFiles([...event.dataTransfer.files]);
  }

  function run() {
    if (locked || !validOptions(options)) return;
    setNotice('');
    void process(mode, options, settings, !ready);
  }

  const heading = items.length ? '文件队列' : '导入图片';
  const totalSize = items.reduce((total, item) => total + item.source.size, 0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand"><span className="brand-symbol"><Hexagon size={21} strokeWidth={2.3} /></span>PixForge</div>
          <button type="button" className="icon-button" aria-label="设置" onClick={() => setShowSettings(true)}><Settings size={20} /></button>
        </div>
      </header>
      <main className="workspace">
        <nav className="mode-tabs" aria-label="图片工具">
          {modes.map(({ id, icon: Icon }) => <button key={id} type="button" aria-pressed={id === mode} disabled={locked && mode !== id}
            onClick={() => changeMode(id)}><Icon size={17} />{MODE_LABELS[id]}</button>)}
        </nav>
        <div className="workbench">
          <section className="queue-panel"
            data-dragging={dragOver || undefined} aria-label={heading}
            onDragEnter={event => {
              if (!event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              dragDepth.current++;
              setDragOver(true);
            }}
            onDragOver={event => {
              if (!event.dataTransfer.types.includes('Files')) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={event => {
              if (!event.dataTransfer.types.includes('Files')) return;
              if (--dragDepth.current <= 0) { dragDepth.current = 0; setDragOver(false); }
            }}
            onDrop={drop}>
            <input ref={importing} type="file" multiple accept="image/*,.svg,.heic,.heif,.avif"
              hidden onChange={event => {
                importFiles(Array.from(event.target.files || []));
                event.target.value = '';
              }} />
            {items.length ? <>
              <div className="queue-header">
                <div><h1>文件队列</h1><p>{items.length} 张 · {formatBytes(totalSize)}{eligible.length !== items.length && ` · 已选 ${eligible.length}`}</p></div>
                <div className="queue-actions">
                  <button className="button" onClick={() => importing.current?.click()}><ImagePlus size={17} />添加</button>
                  <button className="icon-button" aria-label="粘贴图片" title="粘贴图片" onClick={() => void paste()}><Clipboard size={18} /></button>
                  <button className="icon-button" aria-label="清空队列" title="清空队列" disabled={locked}
                    onClick={() => setClearDialog(true)}><Trash2 size={17} /></button>
                </div>
              </div>
              <FileList items={items} actions={rowActions} locked={locked} cropMode={mode === 'crop'} />
            </> : <div className="empty-queue">
              <div className="empty-icon"><ImagePlus size={28} /></div>
              <h1>导入图片</h1>
              <p>拖入、选择文件或粘贴图片。处理在本机完成。</p>
              <div className="empty-actions">
                <button className="primary" onClick={() => importing.current?.click()}><FolderOpen size={18} />选择图片</button>
                <button className="button" onClick={() => void paste()}><Clipboard size={17} />粘贴</button>
              </div>
            </div>}
          </section>
          <OutputPanel key={mode} webp={webp} mode={mode} options={options} onChange={changeOptions} locked={locked}
            presets={allPresets} activePreset={activePreset} onPreset={applyPreset}
            onSavePreset={() => { setPresetName(''); setPresetDialog(true); }}
            onDeletePreset={() => {
              if (updatePresets(presets.filter(preset => preset.id !== activePreset))) {
                setActivePreset('');
                setNotice('已删除预设');
              }
            }} />
        </div>
      </main>
      {(items.length > 0 || notice) && <footer className="action-bar">
        <div className="action-inner">
          <div className="action-info" aria-live="polite">
            {batch ? <div className="progress-info">
              <span>处理中 {batch.current} / {batch.total} · {batch.progress}%</span>
              <progress max="100" value={batch.progress} />
            </div> : exportProgress !== undefined ? <div className="progress-info">
              <span>{exportProgress < 100 ? `准备导出 · ${exportProgress}%` : '等待保存或分享'}</span>
              <progress max="100" value={exportProgress} />
            </div> : !validOptions(options) ? <span className="file-error">检查输出宽高或目标体积</span> :
              <span>{notice || `已选 ${eligible.length} 张${completed.length ? ` · ${completed.length} 份可保存` : ''}${errors ? ` · ${errors} 张失败` : ''}`}</span>}
          </div>
          <div className="action-buttons">
            {batch ? <button className="button" onClick={() => { stop(); setNotice('已取消批量处理'); }}><Square size={15} />取消</button> :
              items.length > 0 && <>
                {completed.length > 0 && <button className="button" disabled={locked} onClick={() => void download(completed)}><Download size={17} />
                  {androidApp ? '保存' : '下载'}{completed.length > 1 ? ` ${completed.length}` : ''}
                </button>}
                {completed.length > 0 && (androidApp || (completed.length === 1 && typeof navigator.share === 'function')) &&
                  <button className="icon-button" disabled={locked} aria-label="分享结果" title="分享结果" onClick={() => void download(completed, true)}><Share2 size={17} /></button>}
                {completed.length > 1 && !androidApp && pickerAvailable &&
                  <button className="icon-button" disabled={locked} aria-label="选择保存位置" title="选择保存位置" onClick={() => void download(completed, false, true)}><FolderOpen size={17} /></button>}
                <button className="primary" disabled={locked || !eligible.length || !validOptions(options)} onClick={run}>
                  {ready ? (errors && eligible.every(item => item.status !== 'pending') ? '重试失败项' : '开始处理') : '重新处理'}
                </button>
              </>}
          </div>
        </div>
      </footer>}
      {preview && <Suspense fallback={<span className="loading-indicator" role="status">正在打开预览…</span>}>
        <PreviewModal key={preview.id} item={preview} onClose={() => setPreviewId(undefined)}
          onNavigate={items.length > 1 ? direction => {
            const index = items.findIndex(item => item.id === preview.id);
            setPreviewId(items[(index + direction + items.length) % items.length].id);
          } : undefined} />
      </Suspense>}
      {crop && <Suspense fallback={<span className="loading-indicator" role="status">正在打开裁剪…</span>}>
        <CropModal key={crop.id} item={crop} onClose={() => setCropId(undefined)}
          onConfirm={edits => { changeEdits(crop.id, edits); setCropId(undefined); }} />
      </Suspense>}
      {showSettings && <SettingsPanel settings={settings} onUpdate={changes => {
        updateSettings(changes);
        if (changes.outputNaming || changes.renamePattern !== undefined) invalidate();
      }} onReset={() => { resetSettings(); invalidate(); }} onClose={() => setShowSettings(false)} />}
      {presetDialog && <Modal title="保存预设" onClose={() => setPresetDialog(false)} className="settings-modal">
        <form className="modal-form" onSubmit={savePreset}>
          <label>预设名称<input value={presetName} maxLength={32} onChange={event => setPresetName(event.target.value)} required /></label>
          <button className="primary" type="submit" disabled={!presetName.trim() || !validOptions(options)}>保存</button>
        </form>
      </Modal>}
      {clearDialog && <Modal title="清空队列" onClose={() => setClearDialog(false)} className="settings-modal">
        <div className="modal-form">
          <p>移除队列中的 {items.length} 张图片及本次处理结果。</p>
          <button className="primary" onClick={() => { remove(); setClearDialog(false); setNotice('已清空队列'); }}>清空</button>
        </div>
      </Modal>}
    </div>
  );
}
