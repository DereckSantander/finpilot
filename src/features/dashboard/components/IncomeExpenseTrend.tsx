import { BarChart3 } from 'lucide-react';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { EmptyState } from '@/components/common/EmptyState';
import { BarTrendChart } from '@/components/charts/BarTrendChart';
import { ROUTES } from '@/constants/routes';
import type { TrendPoint } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface IncomeExpenseTrendProps {
  points: TrendPoint[];
  settings: SettingsRow;
}

/** Widget: comparación de ingresos vs gastos de los últimos meses (barras). */
export function IncomeExpenseTrend({ points, settings }: IncomeExpenseTrendProps) {
  const hasData = points.some((p) => p.income > 0 || p.expense > 0);

  return (
    <DashboardSection
      title="Ingresos vs. gastos"
      icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
      to={ROUTES.statistics}
      actionLabel="Estadísticas"
    >
      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Aún no hay historial"
          description="A medida que registres movimientos verás la evolución mes a mes."
        />
      ) : (
        <>
          <div className="h-56">
            <BarTrendChart
              data={points.map((p) => ({ label: p.label, income: p.income, expense: p.expense }))}
              currency={settings.currency}
              locale={settings.locale}
            />
          </div>
          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
              Ingresos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
              Gastos
            </span>
          </div>
        </>
      )}
    </DashboardSection>
  );
}
