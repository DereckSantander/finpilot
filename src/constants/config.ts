import type { Locale } from '@/types/common';

/** Configuración global e invariantes de la aplicación. */

export const APP_NAME = 'FinPilot';
export const APP_TAGLINE = 'Tu centro de control financiero';

/** Versión del esquema de la base de datos (ver database.md §6). */
export const SCHEMA_VERSION = 1;

/** Versión del formato de respaldo (independiente del esquema). */
export const BACKUP_FORMAT_VERSION = 1;

export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_LOCALE: Locale = 'es';

/** Clave de localStorage usada por el script anti-FOUC de tema (index.html). */
export const THEME_STORAGE_KEY = 'finpilot-theme';

/** Umbrales por defecto del fondo de emergencia (en meses de gasto). */
export const EMERGENCY_FUND_TARGET_MONTHS = [3, 6, 12] as const;

/** Meta de ahorro mensual por defecto (en unidades, no centavos). */
export const DEFAULT_MONTHLY_SAVINGS_TARGET = 300;

/** Umbrales de alerta de utilización de tarjeta (ratios 0–1). */
export const CARD_UTILIZATION_WARN = 0.3;
export const CARD_UTILIZATION_DANGER = 0.7;

/** Días de antelación para alertar sobre el pago de una tarjeta. */
export const CARD_DUE_SOON_DAYS = 5;

/** Tamaño máximo de un comprobante adjunto (5 MB). */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Tamaño de página por defecto para listados largos de movimientos. */
export const TRANSACTIONS_PAGE_SIZE = 50;
