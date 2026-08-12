import { describe, it, expect, beforeEach } from 'vitest';
import { importBackupPayload } from '@/services/backups.service';
import { ensureSettings } from '@/services/settings.service';
import { db } from '@/db/db';
import { resetDb, addTransactionRow, EXPENSE_CAT } from '@/test/seed';
import { ValidationError } from '@/lib/errors';
import { SCHEMA_VERSION } from '@/constants/config';

const EMPTY_TABLES = {
  settings: [],
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

const SETTINGS_ROW = {
  id: 'app',
  currency: 'EUR',
  locale: 'es',
  theme: 'dark',
  startOfMonth: 1,
  monthlySavingsTarget: 50_000,
  emergencyFund: { targetMonths: [3, 6, 12] },
  autoBackup: { enabled: false, frequencyDays: 7, keep: 5 },
  onboardingCompleted: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const envelope = (tables: Record<string, unknown[]>) => ({
  schemaVersion: SCHEMA_VERSION,
  exportedAt: '2026-07-05T12:00:00.000Z',
  tables: { ...EMPTY_TABLES, ...tables },
});

/**
 * Un respaldo sin la fila `settings/app` dejaba la base sin configuración: el
 * `SettingsProvider` se quedaba en el splash y `db.on('populate')` ya no vuelve
 * a ejecutarse en una base existente, así que la app quedaba inservible sin
 * forma de recuperarse desde la interfaz.
 */
describe('restauración de respaldos', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rechaza un respaldo sin configuración sin tocar la base', async () => {
    await addTransactionRow({ type: 'expense', amount: 10_000, date: '2026-07-05' });
    const before = await db.transactions.count();

    await expect(importBackupPayload(envelope({}))).rejects.toBeInstanceOf(ValidationError);

    // La transacción debe haberse revertido entera: nada se aplicó.
    expect(await db.transactions.count()).toBe(before);
    expect(await db.settings.get('app')).toBeDefined();
  });

  it('rechaza un respaldo cuya fila de configuración no es `app`', async () => {
    await expect(
      importBackupPayload(envelope({ settings: [{ ...SETTINGS_ROW, id: 'otra' }] })),
    ).rejects.toBeInstanceOf(ValidationError);

    expect(await db.settings.get('app')).toBeDefined();
  });

  it('un respaldo válido reemplaza el contenido y conserva la configuración', async () => {
    await addTransactionRow({ type: 'expense', amount: 10_000, date: '2026-07-05' });

    const summary = await importBackupPayload(
      envelope({
        settings: [SETTINGS_ROW],
        transactions: [
          {
            id: 'tx-restaurada',
            type: 'expense',
            amount: 4_200,
            date: '2026-06-01',
            yearMonth: '2026-06',
            categoryId: EXPENSE_CAT,
            description: 'Restaurada',
            tags: [],
            createdAt: '2026-06-01T00:00:00.000Z',
            updatedAt: '2026-06-01T00:00:00.000Z',
          },
        ],
      }),
    );

    expect(summary.rows).toBe(2); // settings + 1 movimiento
    const txs = await db.transactions.toArray();
    expect(txs).toHaveLength(1);
    expect(txs[0]?.id).toBe('tx-restaurada');
    expect((await db.settings.get('app'))?.currency).toBe('EUR');
  });

  it('ensureSettings recrea la configuración si falta y es idempotente', async () => {
    await db.settings.clear();
    expect(await db.settings.get('app')).toBeUndefined();

    const created = await ensureSettings();
    expect(created.id).toBe('app');
    expect(await db.settings.get('app')).toBeDefined();

    // Segunda llamada: no debe sobrescribir lo que ya hay.
    await db.settings.update('app', { currency: 'GBP' });
    const again = await ensureSettings();
    expect(again.currency).toBe('GBP');
  });
});
