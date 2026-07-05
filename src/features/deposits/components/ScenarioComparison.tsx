import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { DepositFormDialog } from './DepositFormDialog';
import { formatMoney, formatPercent, formatNumber } from '@/lib/format';
import { handleError } from '@/lib/handle-error';
import { simulateDeposit, COMPOUNDING_LABELS } from '@/lib/calc/interest';
import { CHART_PALETTE } from '@/services/metrics.service';
import { deleteDepositScenario } from '@/services/deposits.service';
import type { SettingsRow, DepositScenarioRow } from '@/db/schema';
import type { DepositScenarioId } from '@/types/ids';
import type { Cents } from '@/types/money';

interface ScenarioComparisonProps {
  scenarios: DepositScenarioRow[];
  settings: SettingsRow;
}

/** Tabla + gráfico comparativo de los escenarios de depósito guardados. */
export function ScenarioComparison({ scenarios, settings }: ScenarioComparisonProps) {
  const [editing, setEditing] = useState<DepositScenarioRow | null>(null);
  const [deleting, setDeleting] = useState<DepositScenarioRow | null>(null);

  const money = (v: Cents) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });

  const rows = useMemo(
    () =>
      scenarios.map((s, index) => ({
        scenario: s,
        color: CHART_PALETTE[index % CHART_PALETTE.length]!,
        result: simulateDeposit({
          principal: s.principal,
          annualRate: s.annualRate,
          termMonths: s.termMonths,
          compounding: s.compounding,
        }),
      })),
    [scenarios],
  );

  const best = rows.reduce<(typeof rows)[number] | null>(
    (acc, r) => (acc === null || r.result.finalAmount > acc.result.finalAmount ? r : acc),
    null,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monto final por escenario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ComparisonBarChart
              labels={rows.map((r) => r.scenario.name)}
              values={rows.map((r) => r.result.finalAmount)}
              colors={rows.map((r) => r.color)}
              currency={settings.currency}
              locale={settings.locale}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Escenario</th>
                <th className="px-4 py-2.5 text-right font-medium">Capital</th>
                <th className="px-4 py-2.5 text-right font-medium">Tasa</th>
                <th className="px-4 py-2.5 text-right font-medium">Plazo</th>
                <th className="px-4 py-2.5 text-left font-medium">Capitaliz.</th>
                <th className="px-4 py-2.5 text-right font-medium">Intereses</th>
                <th className="px-4 py-2.5 text-right font-medium">Monto final</th>
                <th className="px-4 py-2.5 text-right font-medium">Rent.</th>
                <th className="sr-only px-4 py-2.5 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ scenario, color, result }) => (
                <tr
                  key={scenario.id}
                  className="border-b border-border/60 tabular-nums last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{scenario.name}</span>
                      {best?.scenario.id === scenario.id && rows.length > 1 ? (
                        <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-success">
                          Mejor
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">{money(scenario.principal)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {formatPercent(scenario.annualRate, settings.locale, 2)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatNumber(scenario.termMonths, settings.locale)} m
                  </td>
                  <td className="px-4 py-2.5 text-left text-muted-foreground">
                    {COMPOUNDING_LABELS[scenario.compounding]}
                  </td>
                  <td className="px-4 py-2.5 text-right text-success">{money(result.interest)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">
                    {money(result.finalAmount)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {formatPercent(result.roi, settings.locale, 1)}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(scenario)}
                        aria-label={`Editar ${scenario.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleting(scenario)}
                        aria-label={`Eliminar ${scenario.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {editing ? (
        <DepositFormDialog
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
          initial={editing}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Eliminar escenario"
        description={`¿Eliminar "${deleting?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteDepositScenario(deleting.id as DepositScenarioId);
          } catch (err) {
            handleError(err, 'No se pudo eliminar el escenario');
          }
        }}
      />
    </div>
  );
}
