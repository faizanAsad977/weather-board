import { useEffect, useState } from 'react';
import { getTheme, setTheme } from '../services/storage';

function resolveTheme(preference) {
  if (preference === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }
  return preference;
}

export function useTheme() {
  const [preference, setPreference] = useState(() => getTheme());
  const [resolved, setResolved] = useState(() => resolveTheme(getTheme()));

  useEffect(() => {
    const next = resolveTheme(preference);
    setResolved(next);
    document.documentElement.setAttribute('data-theme', next);
    setTheme(preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(resolveTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference]);

  return {
    preference,
    resolved,
    setPreference,
    toggle: () =>
      setPreference((prev) => {
        const current = resolveTheme(prev === 'system' ? 'system' : prev);
        return current === 'dark' ? 'light' : 'dark';
      }),
  };
}
