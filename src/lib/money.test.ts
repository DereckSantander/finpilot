import { describe, it, expect } from 'vitest';
import {
  toCents,
  fromCents,
  parseCents,
  addCents,
  subtractCents,
  sumCents,
  multiplyCents,
  percentOfCents,
  ratioCents,
} from '@/lib/money';
import { asCents } from '@/types/money';

describe('money', () => {
  it('convierte unidades a centavos redondeando al centavo', () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(0.1)).toBe(10);
    // 19.99 * 100 = 1998.9999… en float; el redondeo lo corrige a 1999.
    expect(toCents(19.99)).toBe(1999);
    // Nota: los montos del usuario entran por parseCents (desde texto), no como
    // literales float, para evitar casos irrepresentables como 1.005.
  });

  it('convierte centavos a unidades', () => {
    expect(fromCents(asCents(1234))).toBe(12.34);
  });

  it('evita el clásico error 0.1 + 0.2 !== 0.3', () => {
    const total = addCents(toCents(0.1), toCents(0.2));
    expect(fromCents(total)).toBe(0.3);
  });

  it('suma listas de importes con exactitud', () => {
    const total = sumCents([toCents(10.1), toCents(20.2), toCents(30.3)]);
    expect(total).toBe(6060);
    expect(fromCents(total)).toBe(60.6);
  });

  it('resta importes', () => {
    expect(subtractCents(toCents(100), toCents(33.33))).toBe(6667);
  });

  it('multiplica por un factor redondeando', () => {
    expect(multiplyCents(toCents(100), 0.15)).toBe(1500);
    expect(multiplyCents(asCents(101), 0.5)).toBe(51); // 50.5 -> 51
  });

  it('calcula un porcentaje de un importe', () => {
    expect(percentOfCents(toCents(200), 42)).toBe(8400);
  });

  it('calcula ratios y protege la división por cero', () => {
    expect(ratioCents(toCents(42), toCents(100))).toBeCloseTo(0.42);
    expect(ratioCents(toCents(10), asCents(0))).toBe(0);
  });

  describe('parseCents', () => {
    it('interpreta formato con punto decimal', () => {
      expect(parseCents('1,234.56')).toBe(123456);
    });

    it('interpreta formato con coma decimal', () => {
      expect(parseCents('1.234,56')).toBe(123456);
    });

    it('interpreta enteros y vacíos', () => {
      expect(parseCents('50')).toBe(5000);
      expect(parseCents('')).toBe(0);
      expect(parseCents('$ 12.50')).toBe(1250);
    });
  });
});
