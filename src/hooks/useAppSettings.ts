import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, ThemeMode } from '@/types';

const STORAGE_KEY = 'pixforge_settings';

const DEFAULT_SETTINGS: AppSettings = {
  outputNaming: 'original',
  renamePattern: 'processed',
  themeMode: 'dark',
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings> | null;
      if (!parsed) return { ...DEFAULT_SETTINGS };
      return {
        ...DEFAULT_SETTINGS,
        ...(['light', 'dark', 'system'].includes(parsed.themeMode || '') && { themeMode: parsed.themeMode! }),
        ...(['original', 'suffix', 'rename'].includes(parsed.outputNaming || '') && { outputNaming: parsed.outputNaming! }),
        ...(typeof parsed.renamePattern === 'string' && { renamePattern: parsed.renamePattern.slice(0, 100) }),
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  if (isDark) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  // Apply theme on mount and whenever themeMode changes
  useEffect(() => {
    applyTheme(settings.themeMode);
  }, [settings.themeMode]);

  // Listen for system theme changes
  useEffect(() => {
    if (settings.themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.themeMode]);

  useEffect(() => { saveSettings(settings); }, [settings]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
