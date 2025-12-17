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





export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        
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




export const commonShortcuts = {
  search: { key: 'k', metaKey: true, description: 'Quick search' },
  escape: { key: 'Escape', description: 'Close modal/dialog' },
  submit: { key: 'Enter', metaKey: true, description: 'Submit form' },
  save: { key: 's', metaKey: true, description: 'Save' },
  refresh: { key: 'r', metaKey: true, description: 'Refresh' },
  help: { key: '?', description: 'Show keyboard shortcuts' },
};
