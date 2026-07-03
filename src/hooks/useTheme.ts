import { useContext } from 'react';
import { ThemeContext, type ThemeContextValue } from '@/context/theme.context';

/** Accede al tema actual y a sus acciones. Debe usarse dentro de ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>.');
  }
  return context;
}
