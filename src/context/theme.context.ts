import { createContext } from 'react';
import type { ThemeMode } from '@/types/common';

export interface ThemeContextValue {
  /** Preferencia elegida por el usuario. */
  theme: ThemeMode;
  /** Tema efectivamente aplicado tras resolver 'system'. */
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
