import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/forms/FormDialog';
import { ColorPicker } from '@/components/forms/ColorPicker';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { DEFAULT_ENTITY_COLOR } from '@/constants/palette';
import { createCreditCard, updateCreditCard } from '@/services/creditCards.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { CreditCardRow } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';

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
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ENTITY_COLOR);
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
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Editar tarjeta' : 'Nueva tarjeta'}
      description="Registra los datos de tu tarjeta de crédito."
      submitLabel={initial ? 'Guardar' : 'Crear tarjeta'}
      submitting={submitting}
      error={error}
      onSubmit={() => void submit()}
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

      <ColorPicker value={color} onChange={setColor} />
    </FormDialog>
  );
}
