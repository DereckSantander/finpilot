import {
  Chart,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';

/**
 * Registro único de los componentes de Chart.js usados en la app (dona, barras
 * y líneas). Importar este módulo tiene el efecto de registrar; es idempotente.
 */
Chart.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

Chart.defaults.font.family = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
Chart.defaults.plugins.legend.display = false;

/** Opciones base compartidas para gráficos sin ejes (dona). */
export const baseArcOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
  },
};
