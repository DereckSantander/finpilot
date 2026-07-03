/**
 * Tipos de fila (row types) de cada tabla de IndexedDB.
 * Reflejan fielmente el modelo de datos de database.md §3. El dinero es `Cents`
 * y las fechas son strings ISO branded.
 */
import type { Cents } from '@/types/money';
import type {
  IsoDate,
  IsoDateTime,
  YearMonth,
  TransactionType,
  Priority,
  ThemeMode,
  Locale,
  Timestamps,
} from '@/types/common';
import type {
  CategoryId,
  PaymentMethodId,
  TransactionId,
  TagId,
  AttachmentId,
  CreditCardId,
  CreditCardStatementId,
  CreditCardPaymentId,
  GoalId,
  GoalContributionId,
  BudgetId,
  DepositScenarioId,
  NetWorthSnapshotId,
  ReminderId,
  BackupId,
} from '@/types/ids';

/** Fila única de configuración global (`id: 'app'`). */
export interface SettingsRow extends Timestamps {
  id: 'app';
  currency: string;
  locale: Locale;
  theme: ThemeMode;
  startOfMonth: number;
  monthlySavingsTarget: Cents;
  emergencyFund: {
    targetMonths: number[];
    linkedGoalId?: GoalId;
  };
  autoBackup: {
    enabled: boolean;
    frequencyDays: number;
    keep: number;
  };
  onboardingCompleted: boolean;
}

export interface CategoryRow extends Timestamps {
  id: CategoryId;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  isSystem: boolean;
  isArchived: boolean;
  sortOrder: number;
}

export type PaymentMethodType = 'cash' | 'debit' | 'credit' | 'transfer' | 'other';

export interface PaymentMethodRow extends Timestamps {
  id: PaymentMethodId;
  name: string;
  type: PaymentMethodType;
  creditCardId?: CreditCardId;
  isArchived: boolean;
}

export interface TransactionRow extends Timestamps {
  id: TransactionId;
  type: TransactionType;
  amount: Cents;
  date: IsoDate;
  time?: string;
  yearMonth: YearMonth;
  categoryId: CategoryId;
  paymentMethodId?: PaymentMethodId;
  creditCardId?: CreditCardId;
  description: string;
  notes?: string;
  tags: string[];
  attachmentId?: AttachmentId;
}

export interface TagRow {
  id: TagId;
  name: string;
  createdAt: IsoDateTime;
}

export interface AttachmentRow {
  id: AttachmentId;
  transactionId: TransactionId;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
  createdAt: IsoDateTime;
}

export interface CreditCardRow extends Timestamps {
  id: CreditCardId;
  name: string;
  bank: string;
  creditLimit: Cents;
  cutoffDay: number;
  paymentDueDay: number;
  color: string;
  isArchived: boolean;
}

export type StatementStatus = 'open' | 'paid' | 'partial' | 'overdue';

export interface CreditCardStatementRow extends Timestamps {
  id: CreditCardStatementId;
  creditCardId: CreditCardId;
  yearMonth: YearMonth;
  cutoffDate: IsoDate;
  dueDate: IsoDate;
  statementBalance: Cents;
  minimumPayment: Cents;
  paidAmount: Cents;
  status: StatementStatus;
}

export interface CreditCardPaymentRow {
  id: CreditCardPaymentId;
  creditCardId: CreditCardId;
  statementId?: CreditCardStatementId;
  amount: Cents;
  date: IsoDate;
  createdAt: IsoDateTime;
}

export interface GoalRow extends Timestamps {
  id: GoalId;
  name: string;
  targetAmount: Cents;
  targetDate?: IsoDate;
  priority: Priority;
  color: string;
  icon: string;
  isEmergencyFund: boolean;
  isArchived: boolean;
}

export interface GoalContributionRow {
  id: GoalContributionId;
  goalId: GoalId;
  amount: Cents;
  date: IsoDate;
  note?: string;
  createdAt: IsoDateTime;
}

export interface BudgetRow extends Timestamps {
  id: BudgetId;
  yearMonth: YearMonth;
  categoryId?: CategoryId;
  amount: Cents;
}

export type Compounding = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'atMaturity';

export interface DepositScenarioRow extends Timestamps {
  id: DepositScenarioId;
  name: string;
  principal: Cents;
  annualRate: number;
  termMonths: number;
  compounding: Compounding;
}

export interface NetWorthSnapshotRow {
  id: NetWorthSnapshotId;
  date: IsoDate;
  assets: Cents;
  liabilities: Cents;
  netWorth: Cents;
  createdAt: IsoDateTime;
}

export type ReminderRelatedType = 'creditCard' | 'goal' | 'custom';

export interface ReminderRow extends Timestamps {
  id: ReminderId;
  title: string;
  dueDate: IsoDate;
  relatedType: ReminderRelatedType;
  relatedId?: string;
  isDone: boolean;
}

export interface BackupRow {
  id: BackupId;
  createdAt: IsoDateTime;
  schemaVersion: number;
  sizeBytes: number;
  payload: Blob;
}
