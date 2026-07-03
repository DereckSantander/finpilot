import { PieChart } from 'lucide-react';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { EmptyState } from '@/components/common/EmptyState';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatMoney, formatPercent } from '@/lib/format';
import { ROUTES } from '@/constants/routes';
import { sumCents } from '@/lib/money';
import type { CategorySlice } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface SpendingDonutProps {
  slices: CategorySlice[];
  settings: SettingsRow;
}

/** Widget: distribución de gastos del mes por categoría (dona + leyenda). */
export function SpendingDonut({ slices, settings }: SpendingDonutProps) {
  const total = sumCents(slices.map((s) => s.total));
  const top = slices.slice(0, 6);

  return (
    <DashboardSection
      title="Gastos por categoría"
      icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
      to={ROUTES.statistics}
      actionLabel="Estadísticas"
    >
      {slices.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Sin gastos este mes"
          description="Registra gastos para ver su distribución por categoría."
        />
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <DonutChart
              data={top.map((s) => ({ label: s.name, value: s.total, color: s.color }))}
              currency={settings.currency}
              locale={settings.locale}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatMoney(total, { currency: settings.currency, locale: settings.locale })}
              </span>
            </div>
          </div>

          <ul className="w-full flex-1 space-y-2">
            {top.map((slice) => (
              <li key={slice.categoryId} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPercent(slice.percent, settings.locale)}
                </span>
                <span className="w-20 text-right font-medium tabular-nums">
                  {formatMoney(slice.total, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardSection>
  );
}
