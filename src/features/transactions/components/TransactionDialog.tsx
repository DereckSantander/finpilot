import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionForm } from '@/features/transactions/components/TransactionForm';
import type { TransactionRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';

interface TransactionDialogProps {
  type: TransactionType;
  initial?: TransactionRow | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LABELS: Record<TransactionType, { create: string; edit: string; hint: string }> = {
  income: {
    create: 'Nuevo ingreso',
    edit: 'Editar ingreso',
    hint: 'Registra un ingreso y clasifícalo por categoría.',
  },
  expense: {
    create: 'Nuevo gasto',
    edit: 'Editar gasto',
    hint: 'Registra un gasto con su categoría, método de pago y detalles.',
  },
};

/** Diálogo que envuelve el formulario de movimiento (alta o edición). */
export function TransactionDialog({ type, initial, open, onOpenChange }: TransactionDialogProps) {
  const labels = LABELS[type];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? labels.edit : labels.create}</DialogTitle>
          <DialogDescription>{labels.hint}</DialogDescription>
        </DialogHeader>
        {/* La `key` reinicia el formulario al cambiar entre alta y edición. */}
        <TransactionForm
          key={initial?.id ?? 'new'}
          type={type}
          initial={initial}
          onSubmitted={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
