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
import { MoneyInput } from '@/components/forms/MoneyInput';
import { GOAL_ICON_NAMES, goalIcon } from '@/features/goals/lib/icons';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { cn } from '@/lib/cn';
import { createGoal, updateGoal } from '@/services/goals.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { GoalRow } from '@/db/schema';
import type { Priority } from '@/types/common';
import type { GoalId } from '@/types/ids';

const COLORS = ['#0d9488', '#6366f1', '#e11d48', '#f59e0b', '#8b5cf6', '#0ea5e9', '#16a34a'];

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
  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar meta' : 'Nueva meta'}</DialogTitle>
          <DialogDescription>Define tu objetivo de ahorro.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
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

          <div className="space-y-1.5">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICON_NAMES.map((iconName) => {
                const Icon = goalIcon(iconName);
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                      icon === iconName
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                    aria-label={iconName}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
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

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isEmergencyFund}
              onChange={(e) => setIsEmergencyFund(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            Es mi fondo de emergencia
          </label>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Guardar' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
