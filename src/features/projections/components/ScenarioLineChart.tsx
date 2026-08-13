import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyLineOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
import { withAlpha } from '@/lib/theme-colors';
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
  const data = useChartConfig<ChartData<'line'>>(
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
    [labels, series],
  );

  const options = useChartConfig<ChartOptions<'line'>>(
    // Con varios escenarios superpuestos, la leyenda es imprescindible.
    () => moneyLineOptions({ currency, locale, maxTicksLimit: 5, legend: true }),
    [currency, locale],
  );

  return <Line data={data} options={options} />;
}
