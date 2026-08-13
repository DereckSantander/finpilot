import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { moneyBarOptions } from '@/config/chart';
import { useChartConfig } from '@/hooks/useChartOptions';
import { themeColor } from '@/lib/theme-colors';
import type { CardHistoryMonth } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CardConsumptionChartProps {
  history: CardHistoryMonth[];
  settings: SettingsRow;
}

/** Barras de consumos vs pagos por mes de una tarjeta. */
export function CardConsumptionChart({ history, settings }: CardConsumptionChartProps) {
  const data = useChartConfig<ChartData<'bar'>>(
    () => ({
      labels: history.map((h) => h.label),
      datasets: [
        {
          label: 'Consumos',
          data: history.map((h) => h.consumo),
          backgroundColor: themeColor('--destructive', 0.85),
          borderRadius: 6,
          maxBarThickness: 22,
        },
        {
          label: 'Pagos',
          data: history.map((h) => h.pago),
          backgroundColor: themeColor('--success', 0.85),
          borderRadius: 6,
          maxBarThickness: 22,
        },
      ],
    }),
    [history],
  );

  const options = useChartConfig<ChartOptions<'bar'>>(
    () => moneyBarOptions({ currency: settings.currency, locale: settings.locale }),
    [settings.currency, settings.locale],
  );

  return <Bar data={data} options={options} />;
}
