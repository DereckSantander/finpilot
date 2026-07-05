import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AreaChart } from '@/components/charts/AreaChart';
import { DepositFormDialog, type DepositPreset } from './DepositFormDialog';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { formatMoney, formatPercent } from '@/lib/format';
import { simulateDeposit, depositSchedule, COMPOUNDING_LABELS } from '@/lib/calc/interest';
import { asCents, type Cents } from '@/types/money';
import type { Compounding } from '@/db/schema';

const COMPOUNDINGS: Compounding[] = ['monthly', 'quarterly', 'semiannual', 'annual', 'atMaturity'];

/** Simulador interactivo de un depósito a plazo (capital, tasa, plazo, periodicidad). */
export function DepositSimulator() {
  const settings = useSettings();
  const [principal, setPrincipal] = useState<Cents>(asCents(500_000));
  const [ratePct, setRatePct] = useState('8');
  const [termMonths, setTermMonths] = useState('12');
  const [compounding, setCompounding] = useState<Compounding>('monthly');
  const [saveOpen, setSaveOpen] = useState(false);

  const annualRate = Math.min(Math.max(Number(ratePct) || 0, 0), 100) / 100;
  const term = Math.max(Math.trunc(Number(termMonths) || 0), 0);

  const money = (v: Cents) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const result = useMemo(
    () => simulateDeposit({ principal, annualRate, termMonths: term, compounding }),
    [principal, annualRate, term, compounding],
  );

  const points = useMemo(
    () => depositSchedule({ principal, annualRate, termMonths: term, compounding }),
    [principal, annualRate, term, compounding],
  );

  const preset: DepositPreset = { principal, annualRate, termMonths: term, compounding };
  const canSave = principal > 0 && term > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parámetros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sim-principal">Capital inicial</Label>
              <MoneyInput
                id="sim-principal"
                value={principal}
                onChange={setPrincipal}
                currencySymbol={currencySymbol(settings.currency)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sim-rate">Tasa anual (%)</Label>
                <Input
                  id="sim-rate"
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
                <Label htmlFor="sim-term">Plazo (meses)</Label>
                <Input
                  id="sim-term"
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
              <Label htmlFor="sim-compounding">Capitalización</Label>
              <Select value={compounding} onValueChange={(v) => setCompounding(v as Compounding)}>
                <SelectTrigger id="sim-compounding">
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

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={!canSave}
              onClick={() => setSaveOpen(true)}
            >
              <Save className="h-4 w-4" />
              Guardar escenario
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-rows-2">
          <ResultCard label="Monto final" value={money(result.finalAmount)} intent="primary" />
          <ResultCard label="Intereses ganados" value={money(result.interest)} intent="positive" />
          <ResultCard
            label="Rentabilidad total"
            value={formatPercent(result.roi, settings.locale, 2)}
          />
          <ResultCard
            label="Tasa efectiva anual"
            value={formatPercent(result.effectiveAnnualRate, settings.locale, 2)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Crecimiento del depósito</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <AreaChart
              labels={points.map((p) => p.label)}
              values={points.map((p) => p.value)}
              currency={settings.currency}
              locale={settings.locale}
            />
          </div>
        </CardContent>
      </Card>

      {saveOpen ? (
        <DepositFormDialog open={saveOpen} onOpenChange={setSaveOpen} preset={preset} />
      ) : null}
    </div>
  );
}

function ResultCard({
  label,
  value,
  intent,
}: {
  label: string;
  value: string;
  intent?: 'primary' | 'positive';
}) {
  return (
    <Card>
      <CardContent className="flex flex-col justify-center gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            'truncate text-xl font-semibold tabular-nums' +
            (intent === 'primary' ? ' text-primary' : intent === 'positive' ? ' text-success' : '')
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
