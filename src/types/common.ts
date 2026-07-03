/**
 * Tipos transversales de dominio.
 *
 * Las fechas se almacenan como strings ISO 8601 (branded) y se agrupan por mes
 * con `YearMonth` ("YYYY-MM"). Ver database.md §1.
 */

/** Fecha ISO sin hora: "2026-07-02". */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

/** Fecha-hora ISO completa: "2026-07-02T14:30:00.000Z". */
export type IsoDateTime = string & { readonly __brand: 'IsoDateTime' };

/** Agrupador mensual: "2026-07". */
export type YearMonth = string & { readonly __brand: 'YearMonth' };

/** Tipo de movimiento financiero (discriminador de `transactions`). */
export type TransactionType = 'income' | 'expense';

/** Prioridad de una meta. */
export type Priority = 'low' | 'medium' | 'high';

/** Preferencia de tema del usuario. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Idioma de la interfaz. */
export type Locale = 'es' | 'en';

/** Campos de auditoría comunes a toda entidad persistida. */
export interface Timestamps {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Utilidad: hace opcionales las claves `K` de `T`. */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
