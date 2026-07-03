/**
 * IDs por entidad (branded strings).
 *
 * Impiden usar un `GoalId` donde se espera un `TransactionId`, etc. En runtime
 * son simples strings (nanoid). Ver database.md §1.
 */

type Id<Brand extends string> = string & { readonly __idBrand: Brand };

export type CategoryId = Id<'Category'>;
export type PaymentMethodId = Id<'PaymentMethod'>;
export type TransactionId = Id<'Transaction'>;
export type TagId = Id<'Tag'>;
export type AttachmentId = Id<'Attachment'>;
export type CreditCardId = Id<'CreditCard'>;
export type CreditCardStatementId = Id<'CreditCardStatement'>;
export type CreditCardPaymentId = Id<'CreditCardPayment'>;
export type GoalId = Id<'Goal'>;
export type GoalContributionId = Id<'GoalContribution'>;
export type BudgetId = Id<'Budget'>;
export type DepositScenarioId = Id<'DepositScenario'>;
export type NetWorthSnapshotId = Id<'NetWorthSnapshot'>;
export type ReminderId = Id<'Reminder'>;
export type BackupId = Id<'Backup'>;
