import { describe, it, expect, afterEach } from 'vitest';
import { fileDateStamp } from '@/lib/download';
import { todayIso } from '@/lib/date';
import { freezeTime, unfreezeTime } from '@/test/time';

/**
 * El sello de fecha se usaba con `toISOString()` (UTC) mientras el resto de la
 * app usa fechas locales, así que en husos negativos los informes exportados a
 * última hora de la tarde llevaban la fecha del día siguiente.
 *
 * Se afirma el **invariante** (`fileDateStamp() === todayIso()`) y no un literal,
 * para que la prueba valga en cualquier zona horaria.
 */
describe('fileDateStamp', () => {
  afterEach(unfreezeTime);

  const instants = [
    '2026-07-15T23:30:00.000Z',
    '2026-07-16T00:30:00.000Z',
    '2026-07-16T12:00:00.000Z',
    '2026-12-31T23:59:00.000Z',
    '2026-01-01T00:01:00.000Z',
  ];

  for (const instant of instants) {
    it(`coincide con todayIso() en ${instant}`, () => {
      freezeTime(instant);
      expect(fileDateStamp()).toBe(todayIso());
    });
  }

  it('acepta una fecha explícita', () => {
    expect(fileDateStamp(new Date(2026, 6, 5))).toBe('2026-07-05');
  });
});
