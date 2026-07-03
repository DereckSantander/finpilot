import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import { baseArcOptions } from '@/components/charts/setup';
import { formatMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

export interface DonutDatum {
  label: string;
  value: number; // en centavos
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  currency: string;
  locale: Locale;
}

/** Gráfico de dona (gastos por categoría). Colores por dato; tooltip monetario. */
export function DonutChart({ data, currency, locale }: DonutChartProps) {
  const { resolvedTheme } = useTheme();

  const chartData = useMemo<ChartData<'doughnut'>>(
    () => ({
      labels: data.map((d) => d.label),
      datasets: [
        {
          data: data.map((d) => d.value),
          backgroundColor: data.map((d) => d.color),
          borderColor: themeColor('--card'),
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    // resolvedTheme fuerza recalcular el borde (themeColor lee CSS vars) al cambiar de tema.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, resolvedTheme],
  );

  const options = useMemo<ChartOptions<'doughnut'>>(
    () => ({
      ...baseArcOptions,
      plugins: {
        ...baseArcOptions.plugins,
        tooltip: {
          callbacks: {
            label: (ctx) =>
              ` ${ctx.label ?? ''}: ${formatMoney(asCents(ctx.parsed), { currency, locale })}`,
          },
        },
      },
    }),
    [currency, locale],
  );

  return <Doughnut data={chartData} options={options} />;
}
