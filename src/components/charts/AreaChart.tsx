import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyLineOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
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
  const data = useChartConfig<ChartData<'line'>>(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          borderColor: color ?? themeColor('--primary'),
          backgroundColor: withAlpha(color ?? '#0d9488', 0.15),
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    }),
    [labels, values, color],
  );

  const options = useChartConfig<ChartOptions<'line'>>(
    // El patrimonio puede ser negativo: el eje no debe anclarse al cero.
    () => moneyLineOptions({ currency, locale, beginAtZero: false }),
    [currency, locale],
  );

  return <Line data={data} options={options} />;
}
