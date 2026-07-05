import { describe, it, expect } from 'vitest';
import { projectSavings } from '@/lib/calc/projection';

describe('projectSavings', () => {
  it('el punto inicial (año 0) es el capital inicial', () => {
    const points = projectSavings({ initial: 100_000, monthly: 1_000, years: 3, annualRate: 0.05 });
    expect(points[0]).toMatchObject({ year: 0, label: 'Hoy', value: 100_000 });
  });

  it('devuelve un punto por año más el inicial', () => {
    const points = projectSavings({ initial: 0, monthly: 1_000, years: 5, annualRate: 0 });
    expect(points).toHaveLength(6); // año 0..5
    expect(points.at(-1)?.year).toBe(5);
    expect(points[1]?.label).toBe('1 año');
    expect(points[2]?.label).toBe('2 años');
  });

  it('sin rendimiento acumula solo los aportes (capital + aporte·meses)', () => {
    const points = projectSavings({ initial: 100_000, monthly: 1_000, years: 2, annualRate: 0 });
    // 100.000 + 1.000 · 24 = 124.000
    expect(points.at(-1)?.value).toBe(124_000);
  });

  it('con rendimiento positivo supera al escenario sin rendimiento', () => {
    const base = { initial: 100_000, monthly: 1_000, years: 10 };
    const zero = projectSavings({ ...base, annualRate: 0 }).at(-1)!.value;
    const grown = projectSavings({ ...base, annualRate: 0.06 }).at(-1)!.value;
    expect(grown).toBeGreaterThan(zero);
  });

  it('es monótona creciente con aportes y tasa no negativos', () => {
    const points = projectSavings({ initial: 5_000, monthly: 500, years: 8, annualRate: 0.04 });
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]!.value).toBeGreaterThan(points[i - 1]!.value);
    }
  });
});
