import { db } from '@/db/db';
import { nowIso } from '@/lib/date';
import { NotFoundError } from '@/lib/errors';
import { parseOrThrow } from '@/lib/validation/parse';
import { settingsUpdateSchema } from '@/lib/validation/settings.schema';
import { stripUndefined } from '@/lib/object';
import type { SettingsRow } from '@/db/schema';
import type { ThemeMode } from '@/types/common';

/**
 * Acceso a la configuración global (fila única `settings/app`). Ver ADR-0001:
 * ningún componente habla con Dexie directamente; pasa por este service.
 */

const SETTINGS_ID = 'app';

/** Query reactiva para usar con `useLiveQuery`. */
export function settingsQuery(): Promise<SettingsRow | undefined> {
  return db.settings.get(SETTINGS_ID);
}

/** Lectura puntual (lanza si no existe: la base siempre se siembra al crearse). */
export async function getSettings(): Promise<SettingsRow> {
  const settings = await db.settings.get(SETTINGS_ID);
  if (!settings) throw new NotFoundError('Configuración', SETTINGS_ID);
  return settings;
}

/** Actualiza campos de la configuración (validados con Zod) y refresca `updatedAt`. */
export async function updateSettings(
  patch: Partial<Omit<SettingsRow, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  // Valida la forma (lanza `ValidationError` si algo no cumple); escribimos el
  // patch original para conservar los tipos branded (p. ej. `Cents`).
  parseOrThrow(settingsUpdateSchema, patch);
  await db.settings.update(SETTINGS_ID, { ...stripUndefined(patch), updatedAt: nowIso() });
}

/** Atajo para persistir la preferencia de tema. */
export async function setThemePreference(theme: ThemeMode): Promise<void> {
  await updateSettings({ theme });
}
