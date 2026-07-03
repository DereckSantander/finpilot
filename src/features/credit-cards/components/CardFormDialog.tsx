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
import { cn } from '@/lib/cn';
import { createCreditCard, updateCreditCard } from '@/services/creditCards.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { CreditCardRow } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';

const COLORS = ['#6366f1', '#0d9488', '#e11d48', '#f59e0b', '#8b5cf6', '#0ea5e9', '#111827'];

interface CardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CreditCardRow | undefined;
}

/** Crea o edita una tarjeta de crédito. */
export function CardFormDialog({ open, onOpenChange, initial }: CardFormDialogProps) {
  const settings = useSettings();
  const [name, setName] = useState(initial?.name ?? '');
  const [bank, setBank] = useState(initial?.bank ?? '');
  const [creditLimit, setCreditLimit] = useState<Cents>(initial?.creditLimit ?? ZERO_CENTS);
  const [cutoffDay, setCutoffDay] = useState(String(initial?.cutoffDay ?? 15));
  const [paymentDueDay, setPaymentDueDay] = useState(String(initial?.paymentDueDay ?? 5));
  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !bank.trim()) {
      setError('Indica el nombre y el banco.');
      return;
    }
    if (creditLimit <= 0) {
      setError('El cupo debe ser mayor a cero.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        bank: bank.trim(),
        creditLimit,
        cutoffDay: Number(cutoffDay),
        paymentDueDay: Number(paymentDueDay),
        color,
      };
      if (initial) {
        await updateCreditCard(initial.id as CreditCardId, payload);
      } else {
        await createCreditCard(payload);
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar la tarjeta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar tarjeta' : 'Nueva tarjeta'}</DialogTitle>
          <DialogDescription>Registra los datos de tu tarjeta de crédito.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-name">Nombre</Label>
              <Input
                id="card-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Visa Oro"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-bank">Banco</Label>
              <Input
                id="card-bank"
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                placeholder="Banco Pichincha"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="card-limit">Cupo total</Label>
            <MoneyInput
              id="card-limit"
              value={creditLimit}
              onChange={setCreditLimit}
              currencySymbol={currencySymbol(settings.currency)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="card-cutoff">Día de corte</Label>
              <Input
                id="card-cutoff"
                type="number"
                min={1}
                max={31}
                value={cutoffDay}
                onChange={(e) => setCutoffDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="card-due">Día máx. de pago</Label>
              <Input
                id="card-due"
                type="number"
                min={1}
                max={31}
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition',
                    color === c && 'ring-2 ring-ring',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Guardar' : 'Crear tarjeta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
