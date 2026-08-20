import { Percent, ShieldCheck, Gauge, Info, type LucideIcon } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ExplainableCard } from '@/features/dashboard/components/ExplainableCard';
import { formatPercent } from '@/lib/format';
import type { KpiExplanation, KpiExplanations } from '@/features/dashboard/lib/kpiExplain';
import type {
  DashboardMetrics,
  CardSummary,
  EmergencyFundStatus,
} from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface IndicatorsRowProps {
  metrics: DashboardMetrics;
  emergencyFund: EmergencyFundStatus;
  cards: CardSummary[];
  settings: SettingsRow;
  explanations: KpiExplanations;
}

/** Fila de indicadores financieros clave (tasa de ahorro, fondo, utilización). */
export function IndicatorsRow({
  metrics,
  emergencyFund,
  cards,
  settings,
  explanations,
}: IndicatorsRowProps) {
  const targetMonths = settings.emergencyFund.targetMonths[0] ?? 3;
  const coverageRatio = targetMonths > 0 ? emergencyFund.monthsCovered / targetMonths : 0;

  const avgUtilization =
    cards.length > 0 ? cards.reduce((acc, c) => acc + c.utilization, 0) / cards.length : 0;

  const savingsRateClamped = Math.max(0, Math.min(1, metrics.savingsRate));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Indicator
        title="Tasa de ahorro"
        icon={Percent}
        value={formatPercent(metrics.savingsRate, settings.locale)}
        progress={savingsRateClamped}
        explanation={explanations.savingsRate}
        settings={settings}
      />

      <Indicator
        title="Fondo de emergencia"
        icon={ShieldCheck}
        value={`${emergencyFund.monthsCovered.toFixed(1)} m`}
        progress={coverageRatio}
        footer={`Objetivo: ${targetMonths} meses de gastos`}
        explanation={explanations.emergencyFund}
        settings={settings}
      />

      <Indicator
        title="Utilización de tarjetas"
        icon={Gauge}
        value={cards.length > 0 ? formatPercent(avgUtilization, settings.locale) : '—'}
        progress={avgUtilization}
        footer={
          cards.length > 0 ? `${cards.length} tarjeta(s) activa(s)` : 'Sin tarjetas registradas'
        }
        explanation={explanations.cardUtilization}
        settings={settings}
      />
    </div>
  );
}

function Indicator({
  title,
  icon: Icon,
  value,
  progress,
  footer,
  explanation,
  settings,
}: {
  title: string;
  icon: LucideIcon;
  value: string;
  progress: number;
  footer?: string;
  explanation: KpiExplanation;
  settings: SettingsRow;
}) {
  return (
    <ExplainableCard title={title} explanation={explanation} settings={settings}>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4" /> {title}
            <Info className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </span>
          <span className="text-lg font-semibold tabular-nums">{value}</span>
        </div>
        <ProgressBar value={progress} />
        {footer ? <p className="text-xs text-muted-foreground">{footer}</p> : null}
      </CardContent>
    </ExplainableCard>
  );
}
