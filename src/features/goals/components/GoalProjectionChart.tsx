import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyLineOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
import { themeColor, withAlpha } from '@/lib/theme-colors';
import type { GoalProjection } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface GoalProjectionChartProps {
  projection: GoalProjection;
  color: string;
  settings: SettingsRow;
}

/** Línea de ahorro acumulado real + proyección hacia el objetivo. */
export function GoalProjectionChart({ projection, color, settings }: GoalProjectionChartProps) {
  const data = useChartConfig<ChartData<'line'>>(
    () => ({
      labels: projection.labels,
      datasets: [
        {
          label: 'Ahorro',
          data: projection.actual,
          borderColor: color,
          backgroundColor: withAlpha(color, 0.15),
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          spanGaps: false,
        },
        {
          label: 'Proyección',
          data: projection.projected,
          borderColor: color,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          spanGaps: true,
        },
        {
          label: 'Objetivo',
          data: projection.labels.map(() => projection.target),
          borderColor: themeColor('--muted-foreground', 0.6),
          borderDash: [2, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
        },
      ],
    }),
    [projection, color],
  );

  const options = useChartConfig<ChartOptions<'line'>>(
    () => moneyLineOptions({ currency: settings.currency, locale: settings.locale }),
    [settings.currency, settings.locale],
  );

  return <Line data={data} options={options} />;
}
