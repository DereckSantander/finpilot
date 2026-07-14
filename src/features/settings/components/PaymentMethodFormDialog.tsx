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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveCreditCards } from '@/features/settings/hooks/usePaymentMethodsAdmin';
import { handleError } from '@/lib/handle-error';
import { createPaymentMethod, updatePaymentMethod } from '@/services/paymentMethods.service';
import type { PaymentMethodRow, PaymentMethodType } from '@/db/schema';
import type { PaymentMethodId } from '@/types/ids';

const NONE = '__none__';

const TYPE_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Efectivo',
  debit: 'Débito',
  credit: 'Crédito',
  transfer: 'Transferencia',
  other: 'Otro',
};

interface PaymentMethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Método a editar (si se omite, se crea uno nuevo). */
  initial?: PaymentMethodRow | undefined;
}

/**
 * Crea o edita un método de pago. Vincularlo a una tarjeta es lo que hace que
 * los gastos pagados con ese método cuenten como consumo (y deuda) de la tarjeta.
 */
export function PaymentMethodFormDialog({
  open,
  onOpenChange,
  initial,
}: PaymentMethodFormDialogProps) {
  const cards = useActiveCreditCards();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<PaymentMethodType>(initial?.type ?? 'cash');
  const [cardId, setCardId] = useState<string>(initial?.creditCardId ?? NONE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo un método de tipo "crédito" puede apuntar a una tarjeta.
  const linkedCard = type === 'credit' && cardId !== NONE ? cardId : null;

  const submit = async () => {
    if (!name.trim()) return setError('Indica un nombre para el método de pago.');
    if (type === 'credit' && !linkedCard) {
      return setError('Elige la tarjeta a la que corresponde este método.');
    }
    setSubmitting(true);
    setError(null);
    try {
      if (initial) {
        await updatePaymentMethod(initial.id as PaymentMethodId, {
          name: name.trim(),
          type,
          creditCardId: linkedCard,
        });
      } else {
        await createPaymentMethod({
          name: name.trim(),
          type,
          ...(linkedCard ? { creditCardId: linkedCard } : {}),
        });
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar el método de pago');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar método de pago' : 'Nuevo método de pago'}</DialogTitle>
          <DialogDescription>
            Vincula el método a una tarjeta para que sus gastos sumen a la deuda de esa tarjeta.
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
            <Label htmlFor="pm-name">Nombre</Label>
            <Input
              id="pm-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Visa Banco Pichincha"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pm-type">Tipo</Label>
            <Select value={type} onValueChange={(value) => setType(value as PaymentMethodType)}>
              <SelectTrigger id="pm-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as PaymentMethodType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {TYPE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {type === 'credit' ? (
            <div className="space-y-1.5">
              <Label htmlFor="pm-card">Tarjeta</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger id="pm-card">
                  <SelectValue placeholder="Elegir tarjeta…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin tarjeta</SelectItem>
                  {cards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name} · {card.bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cards.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aún no tienes tarjetas. Créala primero en la sección Tarjetas.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
