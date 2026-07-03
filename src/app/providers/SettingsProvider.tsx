import { useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SettingsContext, type SettingsContextValue } from '@/context/settings.context';
import { settingsQuery } from '@/services/settings.service';
import { AppSplash } from '@/components/common/AppSplash';

/**
 * Carga una sola vez la configuración global (reactiva vía useLiveQuery) y la
 * distribuye por contexto, evitando múltiples suscripciones (architecture.md §5).
 * Muestra un splash mientras la base de datos termina de inicializarse/sembrarse.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(settingsQuery, []);

  const value = useMemo<SettingsContextValue | null>(
    () => (settings ? { settings } : null),
    [settings],
  );

  if (!value) {
    return <AppSplash />;
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
