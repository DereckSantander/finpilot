import { describe, it, expect } from 'vitest';
import { buildPatch } from '@/lib/repository/patch';
import { asCents, type Cents } from '@/types/money';
import type { IsoDate } from '@/types/common';

interface Row {
  name: string;
  amount: Cents;
  date: IsoDate;
  archived: boolean;
  note?: string;
}

interface Input {
  name?: string;
  amount?: number;
  date?: string;
  archived?: boolean;
  note?: string | null;
}

const spec = {
  name: true,
  archived: true,
  note: true,
  amount: asCents,
  date: (v: string) => v as IsoDate,
} as const;

describe('buildPatch', () => {
  it('copia solo los campos presentes', () => {
    const { patch, unset } = buildPatch<Row, Input>({ name: 'Viaje' }, spec);
    expect(patch).toEqual({ name: 'Viaje' });
    expect(unset).toEqual([]);
  });

  it('aplica las conversiones declaradas', () => {
    const { patch } = buildPatch<Row, Input>({ amount: 1234, date: '2026-07-05' }, spec);
    expect(patch).toEqual({ amount: 1234, date: '2026-07-05' });
  });

  it('ignora los campos undefined explícitos (= "no tocar")', () => {
    // `exactOptionalPropertyTypes` impide escribir esto desde código tipado; el
    // cast comprueba que en tiempo de ejecución tampoco se cuela un `undefined`
    // (p. ej. desde un objeto construido dinámicamente).
    const input = { name: 'X', amount: undefined } as unknown as Input;
    const { patch } = buildPatch<Row, Input>(input, spec);
    expect(patch).toEqual({ name: 'X' });
    expect('amount' in patch).toBe(false);
  });

  it('acumula los campos null en `unset` (= "borrar")', () => {
    const { patch, unset } = buildPatch<Row, Input>({ name: 'X', note: null }, spec);
    expect(patch).toEqual({ name: 'X' });
    expect(unset).toEqual(['note']);
  });

  it('conserva los valores falsy que sí son datos', () => {
    // `false` y `0` no son "ausencia": tienen que llegar al parche.
    const { patch } = buildPatch<Row, Input>({ archived: false, amount: 0 }, spec);
    expect(patch).toEqual({ archived: false, amount: 0 });
  });

  it('un input vacío produce un parche vacío', () => {
    const { patch, unset } = buildPatch<Row, Input>({}, spec);
    expect(patch).toEqual({});
    expect(unset).toEqual([]);
  });
});
