import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/context/theme.context';
import { THEME_STORAGE_KEY } from '@/constants/config';
import { setThemePreference } from '@/services/settings.service';
import type { ThemeMode } from '@/types/common';

const MEDIA_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MEDIA_QUERY).matches;
}

/**
 * Gestiona el tema claro/oscuro (ver architecture.md §11).
 * - localStorage es la fuente síncrona (evita el parpadeo, junto al script de
 *   index.html).
 * - La preferencia se replica en la base de datos (settings) para respaldo.
 * - 'system' sigue en vivo los cambios del sistema operativo.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readStoredTheme);
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

  // Sigue los cambios de preferencia del sistema.
  useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Aplica la clase y el color-scheme al <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* localStorage no disponible: se mantiene solo en memoria */
    }
    // Réplica persistente en la base de datos (no bloqueante).
    void setThemePreference(next).catch(() => {
      /* la base aún no está lista o falló: el tema ya se aplicó igualmente */
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
