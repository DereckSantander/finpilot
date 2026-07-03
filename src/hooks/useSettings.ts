import { useContext } from 'react';
import { SettingsContext } from '@/context/settings.context';
import type { SettingsRow } from '@/db/schema';

/** Devuelve la configuración global. Debe usarse dentro de SettingsProvider. */
export function useSettings(): SettingsRow {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings debe usarse dentro de <SettingsProvider>.');
  }
  return context.settings;
}
