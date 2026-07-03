import { TransactionsView } from '@/features/transactions/components/TransactionsView';

/** Gastos (F03): registro con detalle, edición y borrado. */
export function ExpensesPage() {
  return <TransactionsView type="expense" />;
}
