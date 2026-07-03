import { Wallet, PiggyBank, Landmark, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { KpiCard } from '@/features/dashboard/components/KpiCard';
import { formatMoney, formatPercent } from '@/lib/format';
import type { DashboardMetrics } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { Cents } from '@/types/money';

interface FinancialSummaryProps {
  metrics: DashboardMetrics;
  settings: SettingsRow;
}

/** Rejilla de KPIs principales del dashboard (patrimonio, balance, flujos…). */
export function FinancialSummary({ metrics, settings }: FinancialSummaryProps) {
  const money = (value: Cents) =>
    formatMoney(value, {
      currency: settings.currency,
      locale: settings.locale,
    });

  const balanceIntent = metrics.monthBalance >= 0 ? 'positive' : 'negative';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        label="Patrimonio total"
        value={money(metrics.netWorth)}
        icon={Landmark}
        intent="primary"
        hint="Disponible + ahorros − deudas"
      />
      <KpiCard
        label="Dinero disponible"
        value={money(metrics.available)}
        icon={Wallet}
        intent={metrics.available >= 0 ? 'default' : 'negative'}
      />
      <KpiCard
        label="Total ahorrado"
        value={money(metrics.totalSaved)}
        icon={PiggyBank}
        intent="default"
        hint="Acumulado en tus metas"
      />
      <KpiCard
        label="Ingresos del mes"
        value={money(metrics.monthIncome)}
        icon={TrendingUp}
        intent="positive"
      />
      <KpiCard
        label="Gastos del mes"
        value={money(metrics.monthExpense)}
        icon={TrendingDown}
        intent="negative"
      />
      <KpiCard
        label="Balance del mes"
        value={money(metrics.monthBalance)}
        icon={Scale}
        intent={balanceIntent}
        hint={`Tasa de ahorro: ${formatPercent(metrics.savingsRate, settings.locale)}`}
      />
    </div>
  );
}
