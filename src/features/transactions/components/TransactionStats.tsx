import { getDaysInMonth, parseISO } from 'date-fns';
import { BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatMoney, formatPercent } from '@/lib/format';
import { asCents } from '@/types/money';
import type { CategorySlice } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { TransactionType, YearMonth } from '@/types/common';

interface TransactionStatsProps {
  type: TransactionType;
  yearMonth: YearMonth;
  breakdown: CategorySlice[];
  settings: SettingsRow;
}

/** Panel de estadísticas del mes: distribución por categoría e indicadores. */
export function TransactionStats({ type, yearMonth, breakdown, settings }: TransactionStatsProps) {
  const money = (value: number) =>
    formatMoney(asCents(value), { currency: settings.currency, locale: settings.locale });

  const total = breakdown.reduce((acc, slice) => acc + slice.total, 0);
  const daysInMonth = getDaysInMonth(parseISO(`${yearMonth}-01`));
  const dailyAverage = Math.round(total / daysInMonth);
  const topCategory = breakdown[0];
  const label = type === 'income' ? 'ingresos' : 'gastos';

  if (breakdown.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title={`Sin ${label} este mes`}
        description={`Registra ${label} para ver sus estadísticas y distribución.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatChip label={`Total de ${label}`} value={money(total)} />
        <StatChip label="Categorías" value={String(breakdown.length)} />
        <StatChip label="Promedio diario" value={money(dailyAverage)} />
        <StatChip
          label="Categoría principal"
          value={topCategory ? topCategory.name : '—'}
          {...(topCategory ? { hint: formatPercent(topCategory.percent, settings.locale) } : {})}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
            <div className="relative h-52 w-52 shrink-0">
              <DonutChart
                data={breakdown.slice(0, 8).map((s) => ({
                  label: s.name,
                  value: s.total,
                  color: s.color,
                }))}
                currency={settings.currency}
                locale={settings.locale}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <PieChart className="mb-1 h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
              </div>
            </div>

            <ul className="w-full flex-1 space-y-3">
              {breakdown.map((slice) => (
                <li key={slice.categoryId} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate">{slice.name}</span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {money(slice.total)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatPercent(slice.percent, settings.locale)}
                      </span>
                    </span>
                  </div>
                  <ProgressBar value={slice.percent} color={slice.color} />
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatChip({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
