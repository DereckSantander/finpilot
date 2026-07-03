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
import { cn } from '@/lib/cn';
import { asCents, ZERO_CENTS, type Cents } from '@/types/money';
import { createContribution } from '@/services/goalContributions.service';
import type { GoalId } from '@/types/ids';

type Mode = 'deposit' | 'withdraw';

interface ContributionDialogProps {
  goalId: GoalId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Asigna dinero a una meta: aporte (suma) o retiro (resta). */
export function ContributionDialog({ goalId, open, onOpenChange }: ContributionDialogProps) {
  const settings = useSettings();
  const [mode, setMode] = useState<Mode>('deposit');
  const [amount, setAmount] = useState<Cents>(ZERO_CENTS);
  const [date, setDate] = useState(() => todayIso() as string);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (amount <= 0) return setError('Ingresa un monto mayor a cero.');
    setSubmitting(true);
    setError(null);
    try {
      const signed = mode === 'withdraw' ? asCents(-amount) : amount;
      await createContribution({ goalId, amount: signed, date, note });
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo registrar el movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar dinero</DialogTitle>
          <DialogDescription>Aporta o retira dinero de esta meta.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            {(['deposit', 'withdraw'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-md py-1.5 text-sm font-medium transition',
                  mode === m
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'deposit' ? 'Aportar' : 'Retirar'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-amount">Monto</Label>
              <MoneyInput
                id="contrib-amount"
                value={amount}
                onChange={setAmount}
                currencySymbol={currencySymbol(settings.currency)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-date">Fecha</Label>
              <Input
                id="contrib-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contrib-note">Nota (opcional)</Label>
            <Input
              id="contrib-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Ahorro del mes"
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === 'deposit' ? 'Aportar' : 'Retirar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
