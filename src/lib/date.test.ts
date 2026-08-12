import { describe, it, expect, afterEach } from 'vitest';
import { monthProgress, todayIso } from '@/lib/date';
import { freezeTime, unfreezeTime } from '@/test/time';
import type { IsoDate, YearMonth } from '@/types/common';

const ym = (s: string): YearMonth => s as YearMonth;
const iso = (s: string): IsoDate => s as IsoDate;

describe('monthProgress', () => {
  afterEach(unfreezeTime);

  it('en el mes en curso cuenta solo los días transcurridos', () => {
    expect(monthProgress(ym('2026-07'), iso('2026-07-05'))).toEqual({ elapsed: 5, total: 31 });
  });

  it('un mes pasado cuenta entero', () => {
    expect(monthProgress(ym('2026-06'), iso('2026-07-05'))).toEqual({ elapsed: 30, total: 30 });
  });

  it('un mes futuro no ha transcurrido', () => {
    expect(monthProgress(ym('2026-09'), iso('2026-07-05'))).toEqual({ elapsed: 0, total: 30 });
  });

  it('el día 1 cuenta como un día, nunca cero', () => {
    // Evita divisiones por cero en los promedios diarios.
    expect(monthProgress(ym('2026-07'), iso('2026-07-01')).elapsed).toBe(1);
  });

  it('respeta la longitud real del mes (febrero bisiesto)', () => {
    expect(monthProgress(ym('2028-02'), iso('2028-03-01')).total).toBe(29);
    expect(monthProgress(ym('2026-02'), iso('2026-03-01')).total).toBe(28);
  });

  it('sin argumento usa la fecha de hoy', () => {
    freezeTime('2026-07-15T12:00:00.000Z');
    expect(monthProgress(ym('2026-07')).elapsed).toBe(15);
  });
});

describe('todayIso', () => {
  afterEach(unfreezeTime);

  it('devuelve la fecha local en formato ISO corto', () => {
    freezeTime('2026-07-15T12:00:00.000Z');
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
