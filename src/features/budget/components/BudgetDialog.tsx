import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { upsertBudget, updateBudget } from '@/services/budgets.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { CategoryRow, BudgetRow } from '@/db/schema';
import type { YearMonth } from '@/types/common';
import type { BudgetId, CategoryId } from '@/types/ids';

const GENERAL = '__general__';

interface BudgetDialogProps {
  yearMonth: YearMonth;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categorías de gasto disponibles (sin presupuesto aún) para crear. */
  availableCategories: CategoryRow[];
  /** Si se edita, presupuesto existente y su categoría. */
  editing?: { budget: BudgetRow; category?: CategoryRow } | undefined;
}

/** Crea o edita el presupuesto de una categoría (o el general del mes). */
export function BudgetDialog({
  yearMonth,
  open,
  onOpenChange,
  availableCategories,
  editing,
}: BudgetDialogProps) {
  const settings = useSettings();
  const [amount, setAmount] = useState<Cents>(editing?.budget.amount ?? ZERO_CENTS);
  const [categoryId, setCategoryId] = useState<string>(
    editing ? (editing.category?.id ?? GENERAL) : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = Boolean(editing);

  const submit = async () => {
    if (amount <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }
    if (!isEdit && categoryId === '') {
      setError('Selecciona una categoría.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (editing) {
        await updateBudget(editing.budget.id as BudgetId, { amount });
      } else {
        await upsertBudget({
          yearMonth,
          amount,
          ...(categoryId !== GENERAL ? { categoryId: categoryId as CategoryId } : {}),
        });
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar el presupuesto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
          <DialogDescription>
            Define un límite mensual y controla cuánto te queda disponible.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="budget-category">Categoría</Label>
            {isEdit ? (
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                {editing?.category?.name ?? 'Presupuesto general'}
              </div>
            ) : (
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="budget-category">
                  <SelectValue placeholder="Elegir…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENERAL}>Presupuesto general (todo el mes)</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Monto mensual</Label>
            <MoneyInput
              id="budget-amount"
              value={amount}
              onChange={setAmount}
              currencySymbol={currencySymbol(settings.currency)}
              autoFocus
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Guardar' : 'Crear presupuesto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
