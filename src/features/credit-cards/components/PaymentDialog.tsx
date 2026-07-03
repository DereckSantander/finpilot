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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { todayIso } from '@/lib/date';
import { formatMoney } from '@/lib/format';
import { createCardPayment } from '@/services/creditCardPayments.service';
import { type Cents } from '@/types/money';
import type { CreditCardId } from '@/types/ids';

interface PaymentDialogProps {
  cardId: CreditCardId;
  suggestedAmount: Cents;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Registra un pago a la tarjeta. Sugiere pagar el total (objetivo del usuario). */
export function PaymentDialog({ cardId, suggestedAmount, open, onOpenChange }: PaymentDialogProps) {
  const settings = useSettings();
  const [amount, setAmount] = useState<Cents>(suggestedAmount);
  const [date, setDate] = useState(() => todayIso() as string);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (amount <= 0) return setError('Ingresa un monto mayor a cero.');
    setSubmitting(true);
    setError(null);
    try {
      await createCardPayment({ creditCardId: cardId, amount, date });
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo registrar el pago');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Registra un abono a esta tarjeta.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pago-amount">Monto</Label>
              <MoneyInput
                id="pago-amount"
                value={amount}
                onChange={setAmount}
                currencySymbol={currencySymbol(settings.currency)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pago-date">Fecha</Label>
              <Input
                id="pago-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {suggestedAmount > 0 ? (
            <button
              type="button"
              onClick={() => setAmount(suggestedAmount)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Pagar el total:{' '}
              {formatMoney(suggestedAmount, {
                currency: settings.currency,
                locale: settings.locale,
              })}
            </button>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Registrar pago
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
