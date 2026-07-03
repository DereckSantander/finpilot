import type { FinPilotDB } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { toCents } from '@/lib/money';
import {
  DEFAULT_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_MONTHLY_SAVINGS_TARGET,
  EMERGENCY_FUND_TARGET_MONTHS,
} from '@/constants/config';
import { SEED_CATEGORIES, SEED_PAYMENT_METHODS } from '@/constants/categories';
import type { CategoryId, PaymentMethodId } from '@/types/ids';
import type { CategoryRow, PaymentMethodRow, SettingsRow } from '@/db/schema';

/**
 * Sembrado inicial. Se ejecuta UNA sola vez, en `db.on('populate')`, cuando la
 * base de datos se crea por primera vez. Inserta la configuración por defecto,
 * las categorías y los métodos de pago semilla (ver features.md).
 */
export async function populate(db: FinPilotDB): Promise<void> {
  const timestamp = nowIso();

  const settings: SettingsRow = {
    id: 'app',
    currency: DEFAULT_CURRENCY,
    locale: DEFAULT_LOCALE,
    theme: 'system',
    startOfMonth: 1,
    monthlySavingsTarget: toCents(DEFAULT_MONTHLY_SAVINGS_TARGET),
    emergencyFund: {
      targetMonths: [...EMERGENCY_FUND_TARGET_MONTHS],
    },
    autoBackup: {
      enabled: true,
      frequencyDays: 7,
      keep: 5,
    },
    onboardingCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const categories: CategoryRow[] = SEED_CATEGORIES.map((seed, index) => ({
    id: newId<CategoryId>(),
    name: seed.name,
    type: seed.type,
    color: seed.color,
    icon: seed.icon,
    isSystem: true,
    isArchived: false,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  const paymentMethods: PaymentMethodRow[] = SEED_PAYMENT_METHODS.map((seed) => ({
    id: newId<PaymentMethodId>(),
    name: seed.name,
    type: seed.type,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  await db.settings.add(settings);
  await db.categories.bulkAdd(categories);
  await db.paymentMethods.bulkAdd(paymentMethods);
}
