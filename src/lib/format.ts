import { fromCents } from '@/lib/money';
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from '@/constants/config';
import type { Cents } from '@/types/money';
import type { Locale } from '@/types/common';

/**
 * Formateo de presentación. Usa `Intl` (nativo, sin dependencias) para respetar
 * moneda y locale. El dominio nunca formatea: solo la capa de UI.
 */

interface MoneyFormatOptions {
  currency?: string;
  locale?: Locale;
  /** Oculta los decimales cuando el importe es "redondo". */
  hideZeroDecimals?: boolean;
  /** Muestra siempre el signo (+/-). Útil para balances. */
  signDisplay?: 'auto' | 'always' | 'never' | 'exceptZero';
}

const localeTag: Record<Locale, string> = {
  es: 'es-EC',
  en: 'en-US',
};

/** Formatea un importe en `Cents` como texto monetario. */
export function formatMoney(cents: Cents, options: MoneyFormatOptions = {}): string {
  const {
    currency = DEFAULT_CURRENCY,
    locale = DEFAULT_LOCALE,
    hideZeroDecimals = false,
    signDisplay = 'auto',
  } = options;

  const amount = fromCents(cents);
  const fractionDigits = hideZeroDecimals && Number.isInteger(amount) ? 0 : 2;

  return new Intl.NumberFormat(localeTag[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
    signDisplay,
  }).format(amount);
}

/** Formatea un número entero/decimal con separadores de miles. */
export function formatNumber(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(localeTag[locale], {
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formatea un ratio (0–1) como porcentaje ("42 %"). */
export function formatPercent(
  ratio: number,
  locale: Locale = DEFAULT_LOCALE,
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Formato compacto para cifras grandes ("1,2 mil", "1,5 M"). */
export function formatCompactMoney(
  cents: Cents,
  currency: string = DEFAULT_CURRENCY,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return new Intl.NumberFormat(localeTag[locale], {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(fromCents(cents));
}
