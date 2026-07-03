import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthNavigator } from '@/features/transactions/components/MonthNavigator';
import { FinancialSummary } from '@/features/dashboard/components/FinancialSummary';
import { IndicatorsRow } from '@/features/dashboard/components/IndicatorsRow';
import { IncomeExpenseTrend } from '@/features/dashboard/components/IncomeExpenseTrend';
import { SpendingDonut } from '@/features/dashboard/components/SpendingDonut';
import { AlertsWidget } from '@/features/dashboard/components/AlertsWidget';
import { GoalsWidget } from '@/features/dashboard/components/GoalsWidget';
import { CardsWidget } from '@/features/dashboard/components/CardsWidget';
import {
  useDashboardMetrics,
  useCategoryBreakdown,
  useMonthlyTrend,
  useGoalsProgress,
  useCardsSummary,
  useEmergencyFund,
} from '@/features/dashboard/hooks/useDashboardData';
import { computeAlerts } from '@/features/dashboard/lib/alerts';
import { useSettings } from '@/hooks/useSettings';
import { currentYearMonth } from '@/lib/date';
import type { YearMonth } from '@/types/common';

/**
 * Dashboard (F01): centro de control financiero. Todos los datos provienen de
 * IndexedDB vía hooks reactivos (`useLiveQuery`); no hay valores simulados.
 */
export function DashboardPage() {
  const settings = useSettings();
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());

  const metrics = useDashboardMetrics(yearMonth);
  const breakdown = useCategoryBreakdown(yearMonth);
  const trend = useMonthlyTrend(yearMonth, 6);
  const goals = useGoalsProgress();
  const cards = useCardsSummary();
  const emergencyFund = useEmergencyFund(3);

  const ready = metrics && emergencyFund && cards;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Tu centro de control financiero."
        actions={<MonthNavigator value={yearMonth} onChange={setYearMonth} />}
      />

      {!ready ? (
        <DashboardSkeleton />
      ) : (
        <>
          <FinancialSummary metrics={metrics} settings={settings} />

          <IndicatorsRow
            metrics={metrics}
            emergencyFund={emergencyFund}
            cards={cards}
            settings={settings}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <IncomeExpenseTrend points={trend ?? []} settings={settings} />
              <SpendingDonut slices={breakdown ?? []} settings={settings} />
            </div>
            <div className="space-y-4">
              <AlertsWidget alerts={computeAlerts({ metrics, cards, emergencyFund, settings })} />
              <GoalsWidget goals={goals ?? []} settings={settings} />
              <CardsWidget cards={cards} settings={settings} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Esqueleto de carga mientras se resuelven las consultas iniciales. */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
