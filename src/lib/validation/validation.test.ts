import { describe, it, expect } from 'vitest';
import { transactionCreateSchema, quickExpenseSchema } from '@/lib/validation/transactions.schema';
import { categoryCreateSchema } from '@/lib/validation/catalog.schema';
import { parseOrThrow } from '@/lib/validation/parse';
import { ValidationError } from '@/lib/errors';

describe('validación de transacciones', () => {
  it('acepta un gasto válido y aplica defaults', () => {
    const parsed = transactionCreateSchema.parse({
      type: 'expense',
      amount: 1250,
      date: '2026-07-02',
      categoryId: 'cat_1',
    });
    expect(parsed.description).toBe('');
    expect(parsed.tags).toEqual([]);
  });

  it('rechaza montos no positivos', () => {
    const result = transactionCreateSchema.safeParse({
      type: 'expense',
      amount: 0,
      date: '2026-07-02',
      categoryId: 'cat_1',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza montos no enteros (no centavos)', () => {
    const result = transactionCreateSchema.safeParse({
      type: 'income',
      amount: 12.5,
      date: '2026-07-02',
      categoryId: 'cat_1',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza fechas con formato inválido', () => {
    const result = transactionCreateSchema.safeParse({
      type: 'income',
      amount: 100,
      date: '02/07/2026',
      categoryId: 'cat_1',
    });
    expect(result.success).toBe(false);
  });

  it('deduplica etiquetas', () => {
    const parsed = transactionCreateSchema.parse({
      type: 'expense',
      amount: 100,
      date: '2026-07-02',
      categoryId: 'cat_1',
      tags: ['comida', 'comida', 'trabajo'],
    });
    expect(parsed.tags).toEqual(['comida', 'trabajo']);
  });

  it('el quick-add exige monto y categoría', () => {
    expect(quickExpenseSchema.safeParse({ amount: 500, categoryId: 'cat_1' }).success).toBe(true);
    expect(quickExpenseSchema.safeParse({ amount: 500 }).success).toBe(false);
  });
});

describe('parseOrThrow', () => {
  it('lanza ValidationError con la lista de problemas', () => {
    try {
      parseOrThrow(categoryCreateSchema, { name: '', type: 'invalid', color: 'x', icon: '' });
      expect.unreachable('debió lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues?.length).toBeGreaterThan(0);
    }
  });
});
