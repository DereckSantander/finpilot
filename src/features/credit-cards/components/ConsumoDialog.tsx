import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/forms/FormDialog';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { todayIso } from '@/lib/date';
import { createTransaction } from '@/services/transactions.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { CreditCardId } from '@/types/ids';

interface ConsumoDialogProps {
  cardId: CreditCardId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Registra un consumo en la tarjeta (gasto con `creditCardId`). */
export function ConsumoDialog({ cardId, open, onOpenChange }: ConsumoDialogProps) {
  const settings = useSettings();
  const categories = useCategories('expense');
  const paymentMethods = usePaymentMethods();

  const [amount, setAmount] = useState<Cents>(ZERO_CENTS);
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(() => todayIso() as string);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (amount <= 0) return setError('Ingresa un monto mayor a cero.');
    if (!categoryId) return setError('Selecciona una categoría.');
    setSubmitting(true);
    setError(null);
    try {
      // Si la tarjeta tiene un método de pago vinculado, se etiqueta con él para
      // que el desglose por método no lo cuente como "Sin método".
      const method = paymentMethods.find((m) => m.creditCardId === cardId);
      await createTransaction({
        type: 'expense',
        amount,
        date,
        categoryId,
        creditCardId: cardId,
        description,
        tags: [],
        ...(method ? { paymentMethodId: method.id } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo registrar el consumo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar consumo"
      description="Añade un cargo a esta tarjeta."
      submitLabel="Registrar consumo"
      submitting={submitting}
      error={error}
      onSubmit={() => void submit()}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="consumo-amount">Monto</Label>
          <MoneyInput
            id="consumo-amount"
            value={amount}
            onChange={setAmount}
            currencySymbol={currencySymbol(settings.currency)}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="consumo-date">Fecha</Label>
          <Input
            id="consumo-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="consumo-category">Categoría</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="consumo-category">
            <SelectValue placeholder="Elegir…" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="consumo-desc">Descripción (opcional)</Label>
        <Input
          id="consumo-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej. Supermercado"
        />
      </div>
    </FormDialog>
  );
}
