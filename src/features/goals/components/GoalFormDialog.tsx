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
import { ColorPicker } from '@/components/forms/ColorPicker';
import { IconPicker } from '@/components/forms/IconPicker';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { GOAL_ICON_NAMES, goalIcon } from '@/features/goals/lib/icons';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { DEFAULT_ENTITY_COLOR } from '@/constants/palette';
import { createGoal, updateGoal } from '@/services/goals.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { GoalRow } from '@/db/schema';
import type { Priority } from '@/types/common';
import type { GoalId } from '@/types/ids';

const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: GoalRow | undefined;
}

/** Crea o edita una meta de ahorro. */
export function GoalFormDialog({ open, onOpenChange, initial }: GoalFormDialogProps) {
  const settings = useSettings();
  const [name, setName] = useState(initial?.name ?? '');
  const [targetAmount, setTargetAmount] = useState<Cents>(initial?.targetAmount ?? ZERO_CENTS);
  const [targetDate, setTargetDate] = useState<string>(initial?.targetDate ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ENTITY_COLOR);
  const [icon, setIcon] = useState(initial?.icon ?? 'Target');
  const [isEmergencyFund, setIsEmergencyFund] = useState(initial?.isEmergencyFund ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError('Indica un nombre para la meta.');
    if (targetAmount <= 0) return setError('El objetivo debe ser mayor a cero.');
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        targetAmount,
        priority,
        color,
        icon,
        isEmergencyFund,
        ...(targetDate ? { targetDate } : {}),
      };
      if (initial) {
        await updateGoal(initial.id as GoalId, payload);
      } else {
        await createGoal(payload);
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar la meta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Editar meta' : 'Nueva meta'}
      description="Define tu objetivo de ahorro."
      submitLabel={initial ? 'Guardar' : 'Crear meta'}
      submitting={submitting}
      error={error}
      onSubmit={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor="goal-name">Nombre</Label>
        <Input
          id="goal-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Carro, viaje, fondo de emergencia…"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="goal-target">Objetivo</Label>
          <MoneyInput
            id="goal-target"
            value={targetAmount}
            onChange={setTargetAmount}
            currencySymbol={currencySymbol(settings.currency)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-date">Fecha límite (opcional)</Label>
          <Input
            id="goal-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="goal-priority">Prioridad</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger id="goal-priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <IconPicker value={icon} onChange={setIcon} names={GOAL_ICON_NAMES} resolve={goalIcon} />

      <ColorPicker value={color} onChange={setColor} />

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isEmergencyFund}
          onChange={(e) => setIsEmergencyFund(e.target.checked)}
          className="h-4 w-4 rounded border-input accent-primary"
        />
        Es mi fondo de emergencia
      </label>
    </FormDialog>
  );
}
