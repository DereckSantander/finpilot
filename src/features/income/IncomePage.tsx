import { TransactionsView } from '@/features/transactions/components/TransactionsView';

/** Ingresos (F02): registro, edición y borrado de ingresos. */
export function IncomePage() {
  return <TransactionsView type="income" />;
}
