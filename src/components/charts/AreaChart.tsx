import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor, withAlpha } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

interface AreaChartProps {
  labels: string[];
  values: number[]; // en centavos
  color?: string;
  currency: string;
  locale: Locale;
}

/** Gráfico de área/línea de una sola serie monetaria (genérico e interactivo). */
export function AreaChart({ labels, values, color, currency, locale }: AreaChartProps) {
  const { resolvedTheme } = useTheme();
  const stroke = color ?? themeColor('--primary');

  const data = useMemo<ChartData<'line'>>(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          borderColor: stroke,
          backgroundColor: withAlpha(color ?? '#0d9488', 0.15),
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, values, color, resolvedTheme],
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

  return <Line data={data} options={options} />;
}
