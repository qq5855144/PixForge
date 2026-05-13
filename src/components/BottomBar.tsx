import { Shuffle, Minimize2, Crop } from 'lucide-react';
import type { AppMode } from '@/types';

interface BottomBarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function BottomBar({ currentMode, onModeChange }: BottomBarProps) {
  const modes: { id: AppMode; icon: typeof Shuffle; label: string }[] = [
    { id: 'convert', icon: Shuffle, label: '格式转换' },
    { id: 'compress', icon: Minimize2, label: '批量压缩' },
    { id: 'crop', icon: Crop, label: '图片裁剪' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around px-2 md:px-4 pb-[env(safe-area-inset-bottom,0px)]"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
      }}
    >
      {modes.map(({ id, icon: Icon, label }) => {
        const isActive = currentMode === id;
        return (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className="relative flex flex-col items-center justify-center gap-1 w-1/3 h-full rounded-lg transition-all duration-200"
            style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
          >
            {isActive && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              />
            )}
            <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[11px] font-medium leading-tight">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
