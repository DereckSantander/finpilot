import { describe, it, expect } from 'vitest';
import { formatMoney, formatNumber, formatPercent, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';

describe('format', () => {
  it('formatea importes en moneda (locale en)', () => {
    expect(formatMoney(asCents(123456), { currency: 'USD', locale: 'en' })).toBe('$1,234.56');
    expect(formatMoney(asCents(0), { currency: 'USD', locale: 'en' })).toBe('$0.00');
  });

  it('oculta decimales redondos con hideZeroDecimals', () => {
    expect(
      formatMoney(asCents(1000), { currency: 'USD', locale: 'en', hideZeroDecimals: true }),
    ).toBe('$10');
    // No los oculta si hay centavos.
    expect(
      formatMoney(asCents(1050), { currency: 'USD', locale: 'en', hideZeroDecimals: true }),
    ).toBe('$10.50');
  });

  it('muestra el signo con signDisplay', () => {
    expect(
      formatMoney(asCents(500), { currency: 'USD', locale: 'en', signDisplay: 'exceptZero' }),
    ).toBe('+$5.00');
  });

  it('formatea porcentajes desde un ratio 0–1', () => {
    expect(formatPercent(0.42, 'en')).toBe('42%');
    expect(formatPercent(0.4567, 'en', 1)).toBe('45.7%');
  });

  it('formatea números con separadores de miles', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5');
  });

  it('formatea cifras grandes en notación compacta', () => {
    expect(formatCompactMoney(asCents(150_000_00), 'USD', 'en')).toBe('$150K');
  });
});
