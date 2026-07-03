import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

export interface TrendDatum {
  label: string;
  income: number; // centavos
  expense: number; // centavos
}

interface BarTrendChartProps {
  data: TrendDatum[];
  currency: string;
  locale: Locale;
}

/** Barras agrupadas de ingresos vs gastos por mes. */
export function BarTrendChart({ data, currency, locale }: BarTrendChartProps) {
  const { resolvedTheme } = useTheme();

  const chartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: 'Ingresos',
          data: data.map((d) => d.income),
          backgroundColor: themeColor('--success', 0.85),
          borderRadius: 6,
          maxBarThickness: 22,
        },
        {
          label: 'Gastos',
          data: data.map((d) => d.expense),
          backgroundColor: themeColor('--destructive', 0.85),
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    }),
    // resolvedTheme fuerza recomputar colores (themeColor lee CSS vars) al cambiar de tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, resolvedTheme],
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
            maxTicksLimit: 4,
            callback: (value) => formatCompactMoney(asCents(Number(value)), currency, locale),
          },
        },
      },
    }),
    // resolvedTheme fuerza recomputar colores de ejes/grid al cambiar de tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currency, locale, resolvedTheme],
  );

  return <Bar data={chartData} options={options} />;
}
