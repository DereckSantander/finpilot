import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyBarOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
import { withAlpha } from '@/lib/theme-colors';
import type { GoalMonthlyPoint } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface GoalContributionsChartProps {
  points: GoalMonthlyPoint[];
  color: string;
  settings: SettingsRow;
}

/** Barras de aportes por mes de una meta. */
export function GoalContributionsChart({ points, color, settings }: GoalContributionsChartProps) {
  const data = useChartConfig<ChartData<'bar'>>(
    () => ({
      labels: points.map((p) => p.label),
      datasets: [
        {
          data: points.map((p) => p.amount),
          backgroundColor: withAlpha(color, 0.85),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
    }),
    [points, color],
  );

  const options = useChartConfig<ChartOptions<'bar'>>(
    () => moneyBarOptions({ currency: settings.currency, locale: settings.locale }),
    [settings.currency, settings.locale],
  );

  return <Bar data={data} options={options} />;
}
