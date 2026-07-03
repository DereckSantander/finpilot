import { CURRENCIES } from '@/constants/currencies';

/** Devuelve el símbolo de una moneda por su código ISO (fallback: el código). */
export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}
