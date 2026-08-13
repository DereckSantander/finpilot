import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyBarOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
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
  const data = useChartConfig<ChartData<'bar'>>(
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
    [labels, values, colors],
  );

  const options = useChartConfig<ChartOptions<'bar'>>(
    () => moneyBarOptions({ currency, locale }),
    [currency, locale],
  );

  return <Bar data={data} options={options} />;
}
