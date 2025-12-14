import { useEffect, useState } from 'react';

/**
 * Format date as relative time (e.g., "2 hours ago")
 * Auto-updates every minute
 */
export function useRelativeTime(date: Date | string | null | undefined) {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    if (!date) {
      setRelativeTime('');
      return;
    }

    const update = () => {
      const now = new Date();
      const then = new Date(date);

      if (isNaN(then.getTime())) {
        setRelativeTime('Invalid date');
        return;
      }

      const diff = now.getTime() - then.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (years > 0) {
        setRelativeTime(`${years} year${years > 1 ? 's' : ''} ago`);
      } else if (months > 0) {
        setRelativeTime(`${months} month${months > 1 ? 's' : ''} ago`);
      } else if (weeks > 0) {
        setRelativeTime(`${weeks} week${weeks > 1 ? 's' : ''} ago`);
      } else if (days > 0) {
        setRelativeTime(`${days} day${days > 1 ? 's' : ''} ago`);
      } else if (hours > 0) {
        setRelativeTime(`${hours} hour${hours > 1 ? 's' : ''} ago`);
      } else if (minutes > 0) {
        setRelativeTime(`${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else if (seconds > 30) {
        setRelativeTime(`${seconds} seconds ago`);
      } else {
        setRelativeTime('just now');
      }
    };

    update();
    const interval = setInterval(update, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [date]);

  return relativeTime;
}

/**
 * Format date as relative time (non-hook version for use in components)
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  const now = new Date();
  const then = new Date(date);

  if (isNaN(then.getTime())) return 'Invalid date';

  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 30) return `${seconds} seconds ago`;
  return 'just now';
}
