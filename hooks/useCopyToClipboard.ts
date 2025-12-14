import { useState } from 'react';

/**
 * Copy to clipboard hook with visual feedback
 */
export function useCopyToClipboard(resetDelay: number = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopied(false);
      return false;
    }
  };

  return { copy, copied };
}
