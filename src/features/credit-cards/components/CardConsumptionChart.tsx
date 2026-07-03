import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import '@/components/charts/setup';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { useTheme } from '@/hooks/useTheme';
import { themeColor } from '@/lib/theme-colors';
import type { CardHistoryMonth } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CardConsumptionChartProps {
  history: CardHistoryMonth[];
  settings: SettingsRow;
}

/** Barras de consumos vs pagos por mes de una tarjeta. */
export function CardConsumptionChart({ history, settings }: CardConsumptionChartProps) {
  const { resolvedTheme } = useTheme();

  const data = useMemo<ChartData<'bar'>>(
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, resolvedTheme],
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
                currency: settings.currency,
                locale: settings.locale,
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
            callback: (value) =>
              formatCompactMoney(asCents(Number(value)), settings.currency, settings.locale),
          },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.currency, settings.locale, resolvedTheme],
  );

  return <Bar data={data} options={options} />;
}
