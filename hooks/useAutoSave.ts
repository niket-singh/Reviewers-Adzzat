import { useEffect, useRef } from 'react';





export function useAutoSave<T>(
  key: string,
  data: T,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to auto-save:', error);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, data, delay]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  };

  const loadDraft = (): T | null => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  };

  return { clearDraft, loadDraft };
}
