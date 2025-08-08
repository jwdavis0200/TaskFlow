import { useEffect } from 'react';
import { useStore } from '../store';

const THEME_STORAGE_KEY = 'taskflow-theme-preference';

const ThemeManager = () => {
  // Select slices individually to avoid creating a new object each render
  const themePreference = useStore((state) => state.themePreference);
  const resolvedTheme = useStore((state) => state.resolvedTheme);
  const setThemePreference = useStore((state) => state.setThemePreference);
  const setResolvedTheme = useStore((state) => state.setResolvedTheme);

  // Initialize preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      if (saved !== themePreference) {
        setThemePreference(saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to system preference when set to system
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateResolved = () => {
      const next = themePreference === 'system' ? (media.matches ? 'dark' : 'light') : themePreference;
      if (next !== resolvedTheme) {
        setResolvedTheme(next);
      }
    };

    updateResolved();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateResolved);
      return () => media.removeEventListener('change', updateResolved);
    } else {
      // Safari
      media.addListener(updateResolved);
      return () => media.removeListener(updateResolved);
    }
  }, [themePreference, resolvedTheme, setResolvedTheme]);

  // Apply to DOM
  useEffect(() => {
    if (!resolvedTheme) return;
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return null;
};

export default ThemeManager;


