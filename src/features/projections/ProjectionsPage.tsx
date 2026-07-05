import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { MoneyInput } from '@/components/forms/MoneyInput';
import {
  ScenarioLineChart,
  type ChartSeries,
} from '@/features/projections/components/ScenarioLineChart';
import { useProjectionInputs } from '@/features/projections/hooks/useProjectionInputs';
import { useSettings } from '@/hooks/useSettings';
import { projectSavings, type ProjectionPoint } from '@/lib/calc/projection';
import { currencySymbol } from '@/lib/currency';
import { formatMoney } from '@/lib/format';
import { asCents, type Cents } from '@/types/money';
import type { SettingsRow } from '@/db/schema';

interface Scenario {
  key: string;
  label: string;
  rate: number; // decimal anual
  color: string;
}

const SCENARIOS: Scenario[] = [
  { key: 'conservador', label: 'Conservador · 3 %', rate: 0.03, color: '#0ea5e9' },
  { key: 'base', label: 'Base · 5 %', rate: 0.05, color: '#0d9488' },
  { key: 'agresivo', label: 'Agresivo · 8 %', rate: 0.08, color: '#8b5cf6' },
];

const HORIZONS = [1, 3, 5, 10, 15, 20];
const YEARS = 20;

/** Proyecciones (F10): crecimiento del patrimonio a 1–20 años en tres escenarios. */
export function ProjectionsPage() {
  const settings = useSettings();
  const metrics = useProjectionInputs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyecciones"
        description="Proyecta tu patrimonio a 1, 3, 5, 10, 15 y 20 años con distintos rendimientos."
      />
      {metrics === undefined ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <ProjectionsBody
          settings={settings}
          initialNetWorth={Math.max(metrics.netWorth, 0)}
          suggestedMonthly={Math.max(metrics.monthBalance, settings.monthlySavingsTarget, 0)}
        />
      )}
    </div>
  );
}

function ProjectionsBody({
  settings,
  initialNetWorth,
  suggestedMonthly,
}: {
  settings: SettingsRow;
  initialNetWorth: number;
  suggestedMonthly: number;
}) {
  const [initial, setInitial] = useState<Cents>(asCents(Math.round(initialNetWorth)));
  const [monthly, setMonthly] = useState<number>(suggestedMonthly);

  const money = (v: number) =>
    formatMoney(asCents(Math.round(v)), { currency: settings.currency, locale: settings.locale });

  const projections = useMemo<Record<string, ProjectionPoint[]>>(() => {
    const out: Record<string, ProjectionPoint[]> = {};
    for (const s of SCENARIOS) {
      out[s.key] = projectSavings({ initial, monthly, years: YEARS, annualRate: s.rate });
    }
    return out;
  }, [initial, monthly]);

  const labels = projections[SCENARIOS[0]!.key]!.map((p) => p.label);
  const series: ChartSeries[] = SCENARIOS.map((s) => ({
    label: s.label,
    color: s.color,
    values: projections[s.key]!.map((p) => p.value),
  }));

  const valueAt = (key: string, year: number): Cents =>
    projections[key]!.find((p) => p.year === year)?.value ?? asCents(0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="proj-initial">Patrimonio inicial</Label>
            <MoneyInput
              id="proj-initial"
              value={initial}
              onChange={setInitial}
              currencySymbol={currencySymbol(settings.currency)}
            />
            <p className="text-xs text-muted-foreground">Prellenado con tu patrimonio actual.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="proj-monthly">Ahorro mensual</Label>
              <span className="text-sm font-semibold tabular-nums">{money(monthly)}</span>
            </div>
            <input
              id="proj-monthly"
              type="range"
              min={0}
              max={500000}
              step={1000}
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-xs text-muted-foreground">
              Desliza para simular distintos niveles de ahorro (hasta {money(500000)}/mes).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Proyección a {YEARS} años por escenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ScenarioLineChart
              labels={labels}
              series={series}
              currency={settings.currency}
              locale={settings.locale}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Escenario</th>
                {HORIZONS.map((h) => (
                  <th key={h} className="px-4 py-2.5 text-right font-medium">
                    {h} {h === 1 ? 'año' : 'años'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.key} className="border-b border-border/60 tabular-nums last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium">{s.label}</span>
                    </div>
                  </td>
                  {HORIZONS.map((h) => (
                    <td key={h} className="px-4 py-2.5 text-right">
                      {formatMoney(valueAt(s.key, h), {
                        currency: settings.currency,
                        locale: settings.locale,
                        hideZeroDecimals: true,
                      })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Supuestos: aportes mensuales constantes con capitalización mensual sobre el patrimonio
          inicial. Los rendimientos (3 %, 5 %, 8 % anual) son estimaciones; los resultados reales
          dependen del mercado y la inflación.
        </p>
      </div>
    </div>
  );
}
