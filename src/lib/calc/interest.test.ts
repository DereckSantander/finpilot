import { describe, it, expect } from 'vitest';
import { periodsPerYear, simulateDeposit, depositSchedule } from '@/lib/calc/interest';

describe('interest', () => {
  it('mapea la periodicidad a periodos por año', () => {
    expect(periodsPerYear('monthly')).toBe(12);
    expect(periodsPerYear('quarterly')).toBe(4);
    expect(periodsPerYear('semiannual')).toBe(2);
    expect(periodsPerYear('annual')).toBe(1);
    expect(periodsPerYear('atMaturity')).toBe(1);
  });

  describe('simulateDeposit', () => {
    it('interés simple a vencimiento: A = P(1 + r·t)', () => {
      // $1.000 al 10 % anual, 12 meses.
      const r = simulateDeposit({
        principal: 100_000,
        annualRate: 0.1,
        termMonths: 12,
        compounding: 'atMaturity',
      });
      expect(r.finalAmount).toBe(110_000);
      expect(r.interest).toBe(10_000);
      expect(r.roi).toBeCloseTo(0.1, 10);
    });

    it('interés simple a vencimiento con plazo fraccionario (6 meses)', () => {
      const r = simulateDeposit({
        principal: 100_000,
        annualRate: 0.1,
        termMonths: 6,
        compounding: 'atMaturity',
      });
      expect(r.finalAmount).toBe(105_000);
      expect(r.interest).toBe(5_000);
    });

    it('capitalización anual: A = P(1 + r)^t', () => {
      // $1.000 al 10 % anual, 24 meses → 100000·1.1² = 121000.
      const r = simulateDeposit({
        principal: 100_000,
        annualRate: 0.1,
        termMonths: 24,
        compounding: 'annual',
      });
      expect(r.finalAmount).toBe(121_000);
      expect(r.interest).toBe(21_000);
      expect(r.effectiveAnnualRate).toBeCloseTo(0.1, 10);
    });

    it('capitalización trimestral: A = P(1 + r/4)^(4·t)', () => {
      // $1.000 al 8 % anual, 12 meses → 100000·1.02⁴ = 108243.216.
      const r = simulateDeposit({
        principal: 100_000,
        annualRate: 0.08,
        termMonths: 12,
        compounding: 'quarterly',
      });
      expect(r.finalAmount).toBe(108_243);
      expect(r.interest).toBe(8_243);
    });

    it('capitalización mensual y tasa efectiva anual (APY)', () => {
      // $1.000 al 12 % anual mensual, 12 meses → 100000·1.01¹² ≈ 112682.5.
      const r = simulateDeposit({
        principal: 100_000,
        annualRate: 0.12,
        termMonths: 12,
        compounding: 'monthly',
      });
      expect(r.finalAmount).toBe(112_683);
      // APY = (1.01)¹² − 1 ≈ 12.68 %, mayor que la tasa nominal.
      expect(r.effectiveAnnualRate).toBeCloseTo(0.126825, 5);
    });

    it('capital cero no rompe rentabilidad ni APY', () => {
      const r = simulateDeposit({
        principal: 0,
        annualRate: 0.1,
        termMonths: 12,
        compounding: 'monthly',
      });
      expect(r.finalAmount).toBe(0);
      expect(r.interest).toBe(0);
      expect(r.roi).toBe(0);
      expect(r.effectiveAnnualRate).toBe(0);
    });
  });

  describe('depositSchedule', () => {
    it('empieza en el capital y termina en el monto final', () => {
      const params = {
        principal: 100_000,
        annualRate: 0.12,
        termMonths: 12,
        compounding: 'monthly' as const,
      };
      const points = depositSchedule(params);
      const result = simulateDeposit(params);

      expect(points).toHaveLength(13); // mes 0..12
      expect(points[0]!.value).toBe(100_000);
      expect(points[0]!.label).toBe('Inicio');
      expect(points.at(-1)!.value).toBe(result.finalAmount);
    });

    it('es monótona creciente con tasa positiva', () => {
      const points = depositSchedule({
        principal: 50_000,
        annualRate: 0.08,
        termMonths: 24,
        compounding: 'quarterly',
      });
      for (let i = 1; i < points.length; i += 1) {
        expect(points[i]!.value).toBeGreaterThanOrEqual(points[i - 1]!.value);
      }
    });
  });
});
