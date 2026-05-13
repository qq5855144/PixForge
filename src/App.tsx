import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TopBar } from '@/components/TopBar';
import { BottomBar } from '@/components/BottomBar';
import { UploadZone } from '@/components/UploadZone';
import { FileList } from '@/components/FileList';
import { ConvertPanel } from '@/components/ConvertPanel';
import { CompressPanel } from '@/components/CompressPanel';
import { CropPanel } from '@/components/CropPanel';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Lightbox } from '@/components/Lightbox';
import { CropModal } from '@/components/CropModal';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { AppMode, ConvertSettings, CompressSettings } from '@/types';
import './App.css';

export default function App() {
  const [mode, setMode] = useState<AppMode>('convert');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  const { settings, updateSettings, resetSettings } = useAppSettings();
  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    moveFile,
    setRotation,
    cropFile,
    processConvert,
    processCompress,
    downloadFile,
    downloadAll,
    isProcessing,
    globalProgress,
    hasCompleted,
  } = useImageProcessor(settings);

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
  }, []);

  const handleConvert = useCallback((s: ConvertSettings) => processConvert(s), [processConvert]);
  const handleCompress = useCallback((s: CompressSettings) => processCompress(s), [processCompress]);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);
  const prevImage = useCallback(() => setLightboxIndex(i => (i > 0 ? i - 1 : files.length - 1)), [files.length]);
  const nextImage = useCallback(() => setLightboxIndex(i => (i < files.length - 1 ? i + 1 : 0)), [files.length]);

  // Crop handlers
  const handleCropOpen = useCallback((id: string) => {
    setCropTargetId(id);
  }, []);
  const handleCropClose = useCallback(() => setCropTargetId(null), []);
  const handleCropConfirm = useCallback(
    (croppedBlob: Blob) => {
      if (cropTargetId) {
        cropFile(cropTargetId, croppedBlob);
      }
      setCropTargetId(null);
    },
    [cropTargetId, cropFile]
  );

  const cropTargetFile = files.find(f => f.id === cropTargetId);

  return (
    <div
      className="min-h-screen font-sans transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <TopBar onSettingsClick={() => setSettingsOpen(true)} />

      {/* Content area */}
      <main className="pt-14 pb-20 px-3 md:px-0 min-h-screen">
        <div className="max-w-[720px] mx-auto flex flex-col gap-4 py-4 md:py-6">
          {/* Upload zone */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <UploadZone onFilesAdd={addFiles} hasFiles={files.length > 0} />
          </motion.div>

          {/* File list */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <FileList
                  files={files}
                  onRemove={removeFile}
                  onClear={clearFiles}
                  onDownload={downloadFile}
                  onMove={moveFile}
                  onRotate={setRotation}
                  onPreview={openLightbox}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mode panels */}
          <AnimatePresence mode="wait">
            {files.length > 0 && mode === 'convert' && (
              <motion.div
                key="convert"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <ConvertPanel
                  files={files}
                  isProcessing={isProcessing}
                  globalProgress={globalProgress}
                  onProcess={handleConvert}
                  hasCompleted={hasCompleted}
                  onDownloadAll={downloadAll}
                />
              </motion.div>
            )}
            {files.length > 0 && mode === 'compress' && (
              <motion.div
                key="compress"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <CompressPanel
                  files={files}
                  isProcessing={isProcessing}
                  globalProgress={globalProgress}
                  onProcess={handleCompress}
                  hasCompleted={hasCompleted}
                  onDownloadAll={downloadAll}
                />
              </motion.div>
            )}
            {mode === 'crop' && (
              <motion.div
                key="crop"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <CropPanel files={files} onCrop={handleCropOpen} onDownload={downloadFile} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          {files.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-center py-10"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <h3 className="text-[16px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                开始处理图片
              </h3>
              <p className="text-[12px] max-w-[280px] mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                上传图片后，可选择格式转换或批量压缩功能。所有处理均在本地完成。
              </p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Result download bar */}
      <AnimatePresence>
        {hasCompleted && !isProcessing && files.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-20 left-0 right-0 z-40 px-3 md:px-0"
          >
            <div
              className="max-w-[720px] mx-auto h-14 rounded-xl flex items-center justify-between px-4"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow-float)',
              }}
            >
              <span className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold" style={{ color: 'var(--success)' }}>
                  {files.filter(f => f.status === 'completed').length}
                </span>
                <span style={{ color: 'var(--text-secondary)' }}> / {files.length} 个文件处理完成</span>
              </span>
              <button
                onClick={downloadAll}
                className="px-5 h-9 rounded-xl text-[13px] font-medium text-white transition-all duration-200"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                全部下载
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox preview */}
      <Lightbox
        files={files}
        currentIndex={lightboxIndex}
        isOpen={lightboxIndex >= 0}
        onClose={closeLightbox}
        onPrev={prevImage}
        onNext={nextImage}
        onRotate={setRotation}
      />

      {/* Crop Modal */}
      {cropTargetFile && (
        <CropModal
          imageUrl={cropTargetFile.previewUrl}
          isOpen={!!cropTargetId}
          onClose={handleCropClose}
          onConfirm={handleCropConfirm}
        />
      )}

      <BottomBar currentMode={mode} onModeChange={handleModeChange} />
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdate={updateSettings}
        onReset={resetSettings}
      />
    </div>
  );
}
