import { Percent, ShieldCheck, Gauge } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatPercent } from '@/lib/format';
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
}

/** Fila de indicadores financieros clave (tasa de ahorro, fondo, utilización). */
export function IndicatorsRow({ metrics, emergencyFund, cards, settings }: IndicatorsRowProps) {
  const targetMonths = settings.emergencyFund.targetMonths[0] ?? 3;
  const coverageRatio = targetMonths > 0 ? emergencyFund.monthsCovered / targetMonths : 0;

  const avgUtilization =
    cards.length > 0 ? cards.reduce((acc, c) => acc + c.utilization, 0) / cards.length : 0;

  const savingsRateClamped = Math.max(0, Math.min(1, metrics.savingsRate));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Percent className="h-4 w-4" /> Tasa de ahorro
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {formatPercent(metrics.savingsRate, settings.locale)}
            </span>
          </div>
          <ProgressBar value={savingsRateClamped} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" /> Fondo de emergencia
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {emergencyFund.monthsCovered.toFixed(1)} m
            </span>
          </div>
          <ProgressBar value={coverageRatio} />
          <p className="text-xs text-muted-foreground">Objetivo: {targetMonths} meses de gastos</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gauge className="h-4 w-4" /> Utilización de tarjetas
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {cards.length > 0 ? formatPercent(avgUtilization, settings.locale) : '—'}
            </span>
          </div>
          <ProgressBar value={avgUtilization} />
          <p className="text-xs text-muted-foreground">
            {cards.length > 0 ? `${cards.length} tarjeta(s) activa(s)` : 'Sin tarjetas registradas'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
