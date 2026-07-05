import { describe, it, expect } from 'vitest';
import { backupFileSchema, RESTORABLE_TABLES } from '@/lib/validation/backup.schema';

const emptyTables = {
  settings: [{ id: 'app', currency: 'USD' }],
  categories: [],
  paymentMethods: [],
  transactions: [],
  tags: [],
  creditCards: [],
  creditCardStatements: [],
  creditCardPayments: [],
  goals: [],
  goalContributions: [],
  budgets: [],
  depositScenarios: [],
  netWorthSnapshots: [],
  reminders: [],
};

const validEnvelope = {
  schemaVersion: 1,
  exportedAt: '2026-07-05T12:00:00.000Z',
  tables: emptyTables,
};

describe('backup.schema', () => {
  it('acepta una envoltura válida', () => {
    const result = backupFileSchema.safeParse(validEnvelope);
    expect(result.success).toBe(true);
  });

  it('rechaza si falta una tabla', () => {
    const { transactions, ...rest } = emptyTables;
    void transactions;
    const result = backupFileSchema.safeParse({ ...validEnvelope, tables: rest });
    expect(result.success).toBe(false);
  });

  it('rechaza si una tabla no es un arreglo', () => {
    const result = backupFileSchema.safeParse({
      ...validEnvelope,
      tables: { ...emptyTables, transactions: 'nope' },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza envolturas sin esquema o fecha', () => {
    expect(backupFileSchema.safeParse({ tables: emptyTables }).success).toBe(false);
    expect(backupFileSchema.safeParse({ schemaVersion: 1, tables: emptyTables }).success).toBe(
      false,
    );
  });

  it('rechaza objetos ajenos (no un respaldo)', () => {
    expect(backupFileSchema.safeParse({ foo: 'bar' }).success).toBe(false);
    expect(backupFileSchema.safeParse(null).success).toBe(false);
  });

  it('expone las 14 tablas restaurables', () => {
    expect(RESTORABLE_TABLES).toHaveLength(14);
    expect(RESTORABLE_TABLES).toContain('transactions');
    expect(RESTORABLE_TABLES).toContain('settings');
  });
});
