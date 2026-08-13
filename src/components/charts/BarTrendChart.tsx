import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyBarOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
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
  const chartData = useChartConfig<ChartData<'bar'>>(
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
    [data],
  );

  const options = useChartConfig<ChartOptions<'bar'>>(
    () => moneyBarOptions({ currency, locale }),
    [currency, locale],
  );

  return <Bar data={chartData} options={options} />;
}
