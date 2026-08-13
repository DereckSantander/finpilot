import type { ChartOptions } from 'chart.js';
import { formatMoney, formatCompactMoney } from '@/lib/format';
import { asCents } from '@/types/money';
import { themeColor } from '@/lib/theme-colors';
import type { Locale } from '@/types/common';

/**
 * Configuración compartida de Chart.js (la arquitectura ya preveía este archivo).
 * El registro de componentes y los defaults globales siguen en
 * `components/charts/setup.ts`; aquí viven las opciones por gráfico.
 *
 * Existe porque ocho componentes repetían el mismo bloque `scales` palabra por
 * palabra: rejilla, borde, tamaño de fuente, `maxTicksLimit` y el callback de
 * formateo compacto. Cambiar el aspecto de un eje obligaba a tocarlos todos.
 *
 * Se exponen dos constructores concretos (barras y líneas) en lugar de uno
 * genérico: los tipos `DeepPartial` de Chart.js no se comportan bien al
 * parametrizar el tipo de gráfico, y así cada uno queda exactamente tipado.
 *
 * Todas las funciones **leen variables CSS** vía `themeColor`, así que su
 * resultado depende del tema activo. De recalcularlas se encarga `useChartConfig`.
 */

export interface MoneyAxisConfig {
  currency: string;
  locale: Locale;
  /** Marcas máximas del eje Y. Por defecto 4. */
  maxTicksLimit?: number;
}

/** Callback de tooltip que formatea el valor del eje Y como importe. */
function moneyLabel({ currency, locale }: MoneyAxisConfig) {
  return (ctx: { parsed: { y?: number | null }; dataset: { label?: string | undefined } }) => {
    // Un punto nulo es un hueco deliberado de la serie (p. ej. donde termina el
    // dato real y empieza la proyección): no debe aparecer en el tooltip.
    const y = ctx.parsed.y;
    if (y === null || y === undefined) return '';
    const amount = formatMoney(asCents(y), { currency, locale });
    // Con varias series se antepone el nombre ("Ingresos: 1.200 €").
    return ctx.dataset.label ? ` ${ctx.dataset.label}: ${amount}` : ` ${amount}`;
  };
}

/** Ejes cartesianos con el eje Y en formato monetario compacto ("1,2 K"). */
export function moneyScales({ currency, locale, maxTicksLimit = 4 }: MoneyAxisConfig) {
  const tick = { color: themeColor('--muted-foreground'), font: { size: 11 } };

  return {
    x: {
      grid: { display: false },
      ticks: tick,
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: themeColor('--border', 0.5) },
      border: { display: false },
      ticks: {
        ...tick,
        maxTicksLimit,
        callback: (value: string | number) =>
          formatCompactMoney(asCents(Math.round(Number(value))), currency, locale),
      },
    },
  } as const;
}

/** Leyenda inferior con punto de color, para gráficos de varias series. */
export function seriesLegend() {
  return {
    display: true,
    position: 'bottom',
    labels: {
      usePointStyle: true,
      boxWidth: 8,
      font: { size: 11 },
      color: themeColor('--muted-foreground'),
    },
  } as const;
}

/** Opciones para un gráfico de barras de importes. */
export function moneyBarOptions(config: MoneyAxisConfig): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: moneyLabel(config) } },
    },
    scales: moneyScales(config),
  };
}

export interface MoneyLineConfig extends MoneyAxisConfig {
  /** Muestra la leyenda inferior (necesaria con varias series). */
  legend?: boolean;
  /** El eje Y arranca en cero. `false` para series que pueden ser negativas. */
  beginAtZero?: boolean;
}

/** Opciones para un gráfico de líneas/área de importes. */
export function moneyLineOptions(config: MoneyLineConfig): ChartOptions<'line'> {
  const scales = moneyScales(config);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: config.legend ? seriesLegend() : { display: false },
      tooltip: { callbacks: { label: moneyLabel(config) } },
    },
    scales: {
      x: scales.x,
      y: { ...scales.y, beginAtZero: config.beginAtZero ?? true },
    },
  };
}
