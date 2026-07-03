import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
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
  const { resolvedTheme } = useTheme();

  const data = useMemo<ChartData<'line'>>(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projection, color, resolvedTheme],
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ctx.parsed.y === null
                ? ''
                : ` ${ctx.dataset.label ?? ''}: ${formatMoney(asCents(ctx.parsed.y), {
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

  return <Line data={data} options={options} />;
}
