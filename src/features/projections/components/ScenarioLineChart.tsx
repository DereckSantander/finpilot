import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor, withAlpha } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

export interface ChartSeries {
  label: string;
  color: string; // HEX
  values: number[]; // centavos
}

interface ScenarioLineChartProps {
  labels: string[];
  series: ChartSeries[];
  currency: string;
  locale: Locale;
}

/** Varias series monetarias en un mismo gráfico de líneas (comparación de escenarios). */
export function ScenarioLineChart({ labels, series, currency, locale }: ScenarioLineChartProps) {
  const { resolvedTheme } = useTheme();

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels,
      datasets: series.map((s) => ({
        label: s.label,
        data: s.values,
        borderColor: s.color,
        backgroundColor: withAlpha(s.color, 0.12),
        fill: false,
        tension: 0.3,
        pointRadius: 2,
        pointHoverRadius: 4,
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, series, resolvedTheme],
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { size: 11 },
            color: themeColor('--muted-foreground'),
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${ctx.dataset.label ?? ''}: ${formatMoney(asCents(ctx.parsed.y ?? 0), {
                currency,
                locale,
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
            maxTicksLimit: 5,
            callback: (value) =>
              formatCompactMoney(asCents(Math.round(Number(value))), currency, locale),
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, locale, resolvedTheme],
  );

  return <Line data={data} options={options} />;
}
