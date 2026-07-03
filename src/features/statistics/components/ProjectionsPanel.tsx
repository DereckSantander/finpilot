import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AreaChart } from '@/components/charts/AreaChart';
import { projectSavings } from '@/lib/calc/projection';
import { formatMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import type { SettingsRow } from '@/db/schema';

interface ProjectionsPanelProps {
  initialNetWorth: number; // centavos
  suggestedMonthly: number; // centavos
  settings: SettingsRow;
}

const RATES = [
  { value: '0', label: 'Sin rendimiento' },
  { value: '0.03', label: '3 % anual' },
  { value: '0.05', label: '5 % anual' },
  { value: '0.08', label: '8 % anual' },
];

const HORIZONS = [1, 3, 5, 10, 15, 20];

/** Simulación interactiva de crecimiento del ahorro (aporte mensual + interés). */
export function ProjectionsPanel({
  initialNetWorth,
  suggestedMonthly,
  settings,
}: ProjectionsPanelProps) {
  const [monthly, setMonthly] = useState<number>(Math.max(suggestedMonthly, 0));
  const [rate, setRate] = useState('0.05');

  const money = (v: number) =>
    formatMoney(asCents(Math.round(v)), { currency: settings.currency, locale: settings.locale });

  const points = useMemo(
    () =>
      projectSavings({
        initial: Math.max(initialNetWorth, 0),
        monthly,
        years: 20,
        annualRate: Number(rate),
      }),
    [initialNetWorth, monthly, rate],
  );

  const valueAt = (year: number) => points.find((p) => p.year === year)?.value ?? asCents(0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="proj-monthly">Ahorro mensual</Label>
              <span className="text-sm font-semibold tabular-nums">{money(monthly)}</span>
            </div>
            <input
              id="proj-monthly"
              type="range"
              min={0}
              max={200000}
              step={1000}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Desliza para simular distintos niveles de ahorro (hasta {money(200000)}/mes).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proj-rate">Rendimiento anual estimado</Label>
            <Select value={rate} onValueChange={setRate}>
              <SelectTrigger id="proj-rate">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RATES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Partiendo de un patrimonio actual de {money(initialNetWorth)}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {HORIZONS.map((year) => (
          <Card key={year}>
            <CardContent className="space-y-1 p-4">
              <p className="text-xs text-muted-foreground">
                {year === 1 ? '1 año' : `${year} años`}
              </p>
              <p className="truncate text-base font-semibold tabular-nums">
                {money(valueAt(year))}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
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
    </div>
  );
}
