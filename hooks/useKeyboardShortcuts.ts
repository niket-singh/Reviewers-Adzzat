import { useEffect } from 'react';

interface ShortcutHandler {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
}

/**
 * Global keyboard shortcuts hook
 * Power user features for 3x faster workflow
 */
export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Escape and some specific shortcuts even in inputs
        if (e.key !== 'Escape' && !(e.metaKey || e.ctrlKey)) {
          return;
        }
      }

      shortcuts.forEach((shortcut) => {
        const keyMatch = e.key === shortcut.key;
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : true;
        const metaMatch = shortcut.metaKey ? e.metaKey : true;
        const shiftMatch = shortcut.shiftKey !== undefined ? shortcut.shiftKey === e.shiftKey : true;
        const altMatch = shortcut.altKey !== undefined ? shortcut.altKey === e.altKey : true;

        // Check if it's Cmd/Ctrl + key shortcut
        const modifierMatch = shortcut.ctrlKey || shortcut.metaKey
          ? (e.ctrlKey || e.metaKey)
          : true;

        if (keyMatch && modifierMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts
 */
export const commonShortcuts = {
  search: { key: 'k', metaKey: true, description: 'Quick search' },
  escape: { key: 'Escape', description: 'Close modal/dialog' },
  submit: { key: 'Enter', metaKey: true, description: 'Submit form' },
  save: { key: 's', metaKey: true, description: 'Save' },
  refresh: { key: 'r', metaKey: true, description: 'Refresh' },
  help: { key: '?', description: 'Show keyboard shortcuts' },
};
