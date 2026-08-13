import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/forms/FormDialog';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { createGoal } from '@/services/goals.service';
import { updateSettings } from '@/services/settings.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { GoalId } from '@/types/ids';

interface EmergencyFundSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Objetivo sugerido (p. ej. 6 meses de gasto). */
  recommended: Cents;
}

/** Crea el fondo de emergencia (meta especial) y lo enlaza en la configuración. */
export function EmergencyFundSetupDialog({
  open,
  onOpenChange,
  recommended,
}: EmergencyFundSetupDialogProps) {
  const settings = useSettings();
  const [target, setTarget] = useState<Cents>(recommended > 0 ? recommended : ZERO_CENTS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (target <= 0) return setError('Define un objetivo mayor a cero.');
    setSubmitting(true);
    setError(null);
    try {
      const goal = await createGoal({
        name: 'Fondo de emergencia',
        targetAmount: target,
        priority: 'high',
        color: '#f59e0b',
        icon: 'ShieldCheck',
        isEmergencyFund: true,
      });
      await updateSettings({
        emergencyFund: { linkedGoalId: goal.id as GoalId },
      });
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo crear el fondo de emergencia');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-warning" />
          Crear fondo de emergencia
        </span>
      }
      description="Un colchón para imprevistos. Se recomienda cubrir varios meses de gastos."
      submitLabel="Crear fondo"
      submitting={submitting}
      error={error}
      onSubmit={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ef-target">Objetivo</Label>
        <MoneyInput
          id="ef-target"
          value={target}
          onChange={setTarget}
          currencySymbol={currencySymbol(settings.currency)}
          autoFocus
        />
        {recommended > 0 ? (
          <button
            type="button"
            onClick={() => setTarget(recommended)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Usar objetivo recomendado
          </button>
        ) : null}
      </div>
    </FormDialog>
  );
}
