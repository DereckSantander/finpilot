import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

interface ComparisonBarChartProps {
  labels: string[];
  values: number[]; // centavos
  colors?: string[];
  currency: string;
  locale: Locale;
}

/** Barras verticales de una serie monetaria con un color por barra (comparativas). */
export function ComparisonBarChart({
  labels,
  values,
  colors,
  currency,
  locale,
}: ComparisonBarChartProps) {
  const { resolvedTheme } = useTheme();

  const data = useMemo<ChartData<'bar'>>(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors ?? themeColor('--primary', 0.85),
          borderRadius: 6,
          maxBarThickness: 48,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, values, colors, resolvedTheme],
  );

  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${formatMoney(asCents(ctx.parsed.y ?? 0), { currency, locale })}`,
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
              formatCompactMoney(asCents(Math.round(Number(value))), currency, locale),
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, locale, resolvedTheme],
  );

  return <Bar data={data} options={options} />;
}
