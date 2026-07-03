import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor, withAlpha } from '@/lib/theme-colors';
import type { GoalMonthlyPoint } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface GoalContributionsChartProps {
  points: GoalMonthlyPoint[];
  color: string;
  settings: SettingsRow;
}

/** Barras de aportes por mes de una meta. */
export function GoalContributionsChart({ points, color, settings }: GoalContributionsChartProps) {
  const { resolvedTheme } = useTheme();

  const data = useMemo<ChartData<'bar'>>(
    () => ({
      labels: points.map((p) => p.label),
      datasets: [
        {
          label: 'Aportes',
          data: points.map((p) => p.amount),
          backgroundColor: withAlpha(color, 0.85),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, color, resolvedTheme],
  );

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${formatMoney(asCents(ctx.parsed.y ?? 0), {
                currency: settings.currency,
                locale: settings.locale,
              })}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: themeColor('--muted-foreground'), font: { size: 11 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: themeColor('--border', 0.5) },
          border: { display: false },
          ticks: {
            color: themeColor('--muted-foreground'),
            font: { size: 11 },
            maxTicksLimit: 4,
            callback: (value) =>
              formatCompactMoney(asCents(Number(value)), settings.currency, settings.locale),
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.currency, settings.locale, resolvedTheme],
  );

  return <Bar data={data} options={options} />;
}
