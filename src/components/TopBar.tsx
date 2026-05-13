import { Settings, Hexagon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  onSettingsClick: () => void;
}

export function TopBar({ onSettingsClick }: TopBarProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 md:px-6"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Hexagon className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} strokeWidth={2.2} />
        <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          PixForge
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onSettingsClick}
        className="w-9 h-9 rounded-lg hover:bg-[var(--bg-secondary)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Settings className="w-[18px] h-[18px]" />
      </Button>
    </header>
  );
}
