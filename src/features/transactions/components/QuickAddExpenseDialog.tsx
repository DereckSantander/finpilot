import { useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useCategories } from '@/hooks/useCategories';
import { useSettings } from '@/hooks/useSettings';
import { useQuickAddStore } from '@/stores/quickAdd.store';
import { createQuickExpense } from '@/services/transactions.service';
import { handleError } from '@/lib/handle-error';
import { currencySymbol } from '@/lib/currency';
import { formatMoney } from '@/lib/format';
import { ZERO_CENTS, type Cents } from '@/types/money';
import { toast } from 'sonner';

/**
 * Gasto rápido (features.md F03): monto + categoría en segundos. El resto de
 * campos se completan por defecto en el servicio (fecha/hora = ahora, método =
 * último usado). Accesible desde cualquier pantalla vía el store Zustand.
 */
export function QuickAddExpenseDialog() {
  const open = useQuickAddStore((state) => state.open);
  const setOpen = useQuickAddStore((state) => state.setOpen);
  const settings = useSettings();
  const categories = useCategories('expense');

  const [amount, setAmount] = useState<Cents>(ZERO_CENTS);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setAmount(ZERO_CENTS);
    setCategoryId('');
    setDescription('');
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const submit = async () => {
    if (amount <= 0) {
      setError('Ingresa un monto mayor a cero.');
      return;
    }
    if (!categoryId) {
      setError('Selecciona una categoría.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createQuickExpense({ amount, categoryId, description });
      toast.success('Gasto registrado', {
        description: formatMoney(amount, {
          currency: settings.currency,
          locale: settings.locale,
        }),
      });
      reset();
      setOpen(false);
    } catch (err) {
      handleError(err, 'No se pudo registrar el gasto');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Gasto rápido
          </DialogTitle>
          <DialogDescription>Registra un gasto en segundos.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="quick-amount">Monto</Label>
            <MoneyInput
              id="quick-amount"
              value={amount}
              onChange={setAmount}
              currencySymbol={currencySymbol(settings.currency)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-category">Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="quick-category">
                <SelectValue placeholder="Elegir…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="quick-description">Descripción (opcional)</Label>
            <Input
              id="quick-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej. Almuerzo"
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Registrar gasto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
