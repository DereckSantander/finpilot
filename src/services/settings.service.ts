import { db } from '@/db/db';
import { buildDefaultSettings } from '@/db/seed';
import { nowIso } from '@/lib/date';
import { NotFoundError } from '@/lib/errors';
import { parseOrThrow } from '@/lib/validation/parse';
import { settingsUpdateSchema } from '@/lib/validation/settings.schema';
import { stripUndefined } from '@/lib/object';
import type { SettingsRow } from '@/db/schema';
import type { Locale, ThemeMode } from '@/types/common';
import type { Cents } from '@/types/money';

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

/**
 * Garantiza que exista la fila `settings/app`, recreándola con los valores por
 * defecto si falta. `db.on('populate')` solo se ejecuta al crear la base, así
 * que sin esta red una base que se quede sin configuración (p. ej. tras
 * restaurar un respaldo corrupto) dejaría la app atascada en el splash para
 * siempre. Idempotente: si la fila existe, no la toca.
 */
export async function ensureSettings(): Promise<SettingsRow> {
  const existing = await db.settings.get(SETTINGS_ID);
  if (existing) return existing;

  const defaults = buildDefaultSettings();
  await db.settings.put(defaults);
  return defaults;
}

/**
 * Parche de configuración. Los objetos anidados son **parciales**: se fusionan
 * con el valor actual en lugar de reemplazarlo, así que basta con enviar el
 * campo que cambia.
 */
export interface SettingsPatch {
  currency?: string;
  locale?: Locale;
  theme?: ThemeMode;
  startOfMonth?: number;
  monthlySavingsTarget?: Cents;
  emergencyFund?: Partial<SettingsRow['emergencyFund']>;
  autoBackup?: Partial<SettingsRow['autoBackup']>;
  onboardingCompleted?: boolean;
}

/**
 * Actualiza campos de la configuración (validados con Zod) y refresca `updatedAt`.
 *
 * `db.settings.update` fusiona solo el primer nivel: escribir `autoBackup`
 * reemplaza el objeto entero, de modo que un parche parcial borraría los campos
 * hermanos. Por eso los dos objetos anidados se fusionan aquí a mano contra el
 * valor persistido, dentro de una transacción para que la lectura y la escritura
 * no se crucen con otra pestaña.
 */
export async function updateSettings(patch: SettingsPatch): Promise<void> {
  // Valida la forma (lanza `ValidationError` si algo no cumple); escribimos el
  // patch original para conservar los tipos branded (p. ej. `Cents`).
  parseOrThrow(settingsUpdateSchema, patch);

  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    const { emergencyFund, autoBackup, ...flat } = patch;

    await db.settings.update(SETTINGS_ID, {
      ...stripUndefined(flat),
      ...(emergencyFund && {
        emergencyFund: { ...current.emergencyFund, ...stripUndefined(emergencyFund) },
      }),
      ...(autoBackup && {
        autoBackup: { ...current.autoBackup, ...stripUndefined(autoBackup) },
      }),
      updatedAt: nowIso(),
    });
  });
}

/**
 * Desvincula la meta del fondo de emergencia. Es una operación aparte porque en
 * `updateSettings` un `undefined` significa "no cambiar", no "borrar".
 */
export async function unlinkEmergencyFundGoal(): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const current = await getSettings();
    if (current.emergencyFund.linkedGoalId === undefined) return;

    const { linkedGoalId: _removed, ...emergencyFund } = current.emergencyFund;
    await db.settings.update(SETTINGS_ID, { emergencyFund, updatedAt: nowIso() });
  });
}

/** Atajo para persistir la preferencia de tema. */
export async function setThemePreference(theme: ThemeMode): Promise<void> {
  await updateSettings({ theme });
}
