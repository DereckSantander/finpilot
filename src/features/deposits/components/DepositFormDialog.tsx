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
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { COMPOUNDING_LABELS } from '@/lib/calc/interest';
import { createDepositScenario, updateDepositScenario } from '@/services/deposits.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { Compounding, DepositScenarioRow } from '@/db/schema';
import type { DepositScenarioId } from '@/types/ids';

const COMPOUNDINGS: Compounding[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'atMaturity'];

/** Valores para prellenar el formulario al guardar desde el simulador. */
export interface DepositPreset {
  principal: Cents;
  annualRate: number; // decimal
  termMonths: number;
  compounding: Compounding;
}

interface DepositFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Escenario a editar. Si se omite, se crea uno nuevo. */
  initial?: DepositScenarioRow | undefined;
  /** Valores iniciales al crear (p. ej. desde el simulador). */
  preset?: DepositPreset | undefined;
}

/** Crea o edita un escenario del simulador de depósitos a plazo. */
export function DepositFormDialog({ open, onOpenChange, initial, preset }: DepositFormDialogProps) {
  const settings = useSettings();
  const [name, setName] = useState(initial?.name ?? '');
  const [principal, setPrincipal] = useState<Cents>(
    initial?.principal ?? preset?.principal ?? ZERO_CENTS,
  );
  const [ratePct, setRatePct] = useState<string>(
    String(((initial?.annualRate ?? preset?.annualRate ?? 0.08) * 100).toFixed(2)),
  );
  const [termMonths, setTermMonths] = useState<string>(
    String(initial?.termMonths ?? preset?.termMonths ?? 12),
  );
  const [compounding, setCompounding] = useState<Compounding>(
    initial?.compounding ?? preset?.compounding ?? 'monthly',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return setError('Indica un nombre para el escenario.');
    if (principal <= 0) return setError('El capital debe ser mayor a cero.');

    const annualRate = Number(ratePct) / 100;
    if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 1) {
      return setError('La tasa debe estar entre 0 % y 100 %.');
    }
    const term = Math.trunc(Number(termMonths));
    if (!Number.isInteger(term) || term <= 0) {
      return setError('El plazo debe ser un número de meses mayor a cero.');
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = { name: name.trim(), principal, annualRate, termMonths: term, compounding };
      if (initial) {
        await updateDepositScenario(initial.id as DepositScenarioId, payload);
      } else {
        await createDepositScenario(payload);
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar el escenario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar escenario' : 'Guardar escenario'}</DialogTitle>
          <DialogDescription>
            Un escenario guarda capital, tasa, plazo y periodicidad para compararlo con otros.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="dep-name">Nombre</Label>
            <Input
              id="dep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Banco X 90 días, Póliza 12 meses…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-principal">Capital</Label>
            <MoneyInput
              id="dep-principal"
              value={principal}
              onChange={setPrincipal}
              currencySymbol={currencySymbol(settings.currency)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dep-rate">Tasa anual (%)</Label>
              <Input
                id="dep-rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max="100"
                value={ratePct}
                onChange={(e) => setRatePct(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dep-term">Plazo (meses)</Label>
              <Input
                id="dep-term"
                type="number"
                inputMode="numeric"
                step="1"
                min="1"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dep-compounding">Capitalización</Label>
            <Select value={compounding} onValueChange={(v) => setCompounding(v as Compounding)}>
              <SelectTrigger id="dep-compounding">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPOUNDINGS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {COMPOUNDING_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Guardar cambios' : 'Guardar escenario'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
