'use client';

import { useUIStore } from '@/store/ui';
import { Modal } from '@/components/ui/Modal';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Open global search / command palette' },
  { keys: ['Esc'], label: 'Close dialogs and menus' },
  { keys: ['↑', '↓'], label: 'Move between search results' },
  { keys: ['↵'], label: 'Open the selected result' },
  { keys: ['G', 'D'], label: 'Tip: type “dashboard” in search to jump' },
];

export function ShortcutsHelp() {
  const open = useUIStore((s) => s.helpOpen);
  const setOpen = useUIStore((s) => s.setHelpOpen);

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Keyboard shortcuts">
      <div className="space-y-2 p-5">
        {SHORTCUTS.map((s) => (
          <div key={s.label} className="flex items-center justify-between rounded-lg px-1 py-2">
            <span className="text-sm text-text-primary">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-[24px] rounded-md border border-brand-border bg-background px-2 py-1 text-center text-xs font-medium text-text-secondary"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
