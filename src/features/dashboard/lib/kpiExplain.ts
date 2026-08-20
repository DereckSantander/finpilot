import { formatDate } from '@/lib/date';
import type {
  CardSummary,
  DashboardMetrics,
  EmergencyFundStatus,
} from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { IsoDate } from '@/types/common';
import type { Cents } from '@/types/money';

/**
 * Explicación de un KPI del dashboard: de qué partes se compone y qué regla se
 * aplicó. Es una descripción **de datos**, no de presentación: se construye aquí
 * (puro, testeable) y `KpiDetailDialog` decide cómo pintarla.
 *
 * Los importes vienen en centavos y los formatea la vista; así el mismo desglose
 * respeta la moneda y el locale de configuración sin duplicar `formatMoney`.
 */

/** Fila del desglose: un sumando, un dato de contexto o el resultado. */
export interface KpiRow {
  label: string;
  /** Importe en centavos. Excluyente con `text`. */
  amount?: Cents;
  /** Valor ya formateado (porcentajes, meses, conteos…). */
  text?: string;
  /** Operador con el que la fila entra en la fórmula. */
  op?: '+' | '−' | '÷' | '=';
  /** Fila de resultado: se resalta y se separa del resto. */
  total?: boolean;
}

export interface KpiExplanation {
  /** Fórmula en una línea, en el lenguaje del usuario. */
  formula: string;
  rows: KpiRow[];
  /** Matices que no caben en la fórmula (por qué se excluye algo, etc.). */
  notes?: string[];
}

export type KpiKey =
  | 'netWorth'
  | 'available'
  | 'totalSaved'
  | 'monthIncome'
  | 'monthExpense'
  | 'monthBalance'
  | 'savingsRate'
  | 'emergencyFund'
  | 'cardUtilization';

/** Desglose de todos los indicadores del dashboard, indexado por KPI. */
export type KpiExplanations = Record<KpiKey, KpiExplanation>;

interface ExplainInput {
  metrics: DashboardMetrics;
  emergencyFund: EmergencyFundStatus;
  cards: CardSummary[];
  settings: SettingsRow;
  /** Formateador de importes; se inyecta para no atar este módulo a la UI. */
  money: (amount: Cents) => string;
}

function monthLabel(metrics: DashboardMetrics, settings: SettingsRow): string {
  return formatDate(`${metrics.yearMonth}-01` as IsoDate, 'LLLL yyyy', settings.locale);
}

/** Desglose de cada KPI del dashboard a partir de las métricas ya derivadas. */
export function buildKpiExplanations(input: ExplainInput): KpiExplanations {
  const { metrics, emergencyFund, cards, settings, money } = input;
  const c = metrics.components;
  const month = monthLabel(metrics, settings);
  const percent = (value: number) =>
    new Intl.NumberFormat(settings.locale, {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(value);

  const avgUtilization =
    cards.length > 0 ? cards.reduce((acc, card) => acc + card.utilization, 0) / cards.length : 0;

  return {
    netWorth: {
      formula: 'Ingresos acumulados − gastos acumulados',
      rows: [
        { label: 'Ingresos de toda tu historia', amount: c.lifetimeIncome, op: '+' },
        { label: 'Gastos de toda tu historia', amount: c.lifetimeExpense, op: '−' },
        { label: 'Patrimonio total', amount: metrics.netWorth, op: '=', total: true },
      ],
      notes: [
        'Un consumo con tarjeta ya cuenta como gasto el día que lo haces, así que pagar la tarjeta después no cambia el patrimonio.',
        `Incluye ${metrics.transactionsCount} movimiento(s) registrados.`,
      ],
    },

    available: {
      formula: 'Ingresos − gastos que salieron de caja − pagos de tarjeta − ahorro en metas',
      rows: [
        { label: 'Ingresos de toda tu historia', amount: c.lifetimeIncome, op: '+' },
        { label: 'Gastos sin tarjeta de crédito', amount: c.nonCardExpense, op: '−' },
        { label: 'Pagos hechos a las tarjetas', amount: c.cardPayments, op: '−' },
        { label: 'Ahorrado en metas (incl. archivadas)', amount: metrics.totalSaved, op: '−' },
        { label: 'Dinero disponible', amount: metrics.available, op: '=', total: true },
      ],
      notes: [
        `Los consumos con tarjeta (${money(c.cardConsumos)}) no restan aquí: no salen de tu caja hasta que pagas la tarjeta. Figuran como deuda.`,
        'El dinero apartado en metas tampoco cuenta como disponible.',
      ],
    },

    totalSaved: {
      formula: 'Suma de los aportes netos de todas tus metas',
      rows: [
        { label: 'Ahorrado en metas activas', amount: metrics.activeSaved },
        {
          label: 'Ahorrado en metas archivadas',
          amount: (metrics.totalSaved - metrics.activeSaved) as Cents,
        },
        { label: 'Total ahorrado', amount: metrics.totalSaved, op: '=', total: true },
      ],
      notes: [
        'Cada meta se calcula como aportes − retiros, sin bajar de cero: una meta no puede restar ahorro a otra.',
        'La pantalla de Metas muestra solo las activas; aquí se incluyen las archivadas porque ese dinero también salió de la caja.',
      ],
    },

    monthIncome: {
      formula: `Suma de los ingresos registrados en ${month}`,
      rows: [{ label: `Ingresos de ${month}`, amount: metrics.monthIncome, op: '=', total: true }],
      notes: ['El mes se toma del selector de la cabecera, no de la fecha de hoy.'],
    },

    monthExpense: {
      formula: `Suma de los gastos registrados en ${month}`,
      rows: [
        { label: `Gastos de ${month}`, amount: metrics.monthExpense, op: '=', total: true },
        { label: 'De los cuales, con tarjeta (histórico)', amount: c.cardConsumos },
      ],
      notes: [
        'Cuenta el gasto el día que lo haces, se pague con efectivo, transferencia o tarjeta.',
        'Los pagos a la tarjeta no son un gasto nuevo: solo cancelan la deuda del consumo que ya se contó.',
      ],
    },

    monthBalance: {
      formula: 'Ingresos del mes − gastos del mes',
      rows: [
        { label: `Ingresos de ${month}`, amount: metrics.monthIncome, op: '+' },
        { label: `Gastos de ${month}`, amount: metrics.monthExpense, op: '−' },
        { label: 'Balance del mes', amount: metrics.monthBalance, op: '=', total: true },
      ],
      notes: ['Es lo que te quedó (o te faltó) en el mes; no arrastra saldo de meses anteriores.'],
    },

    savingsRate: {
      formula: 'Balance del mes ÷ ingresos del mes',
      rows: [
        { label: 'Balance del mes', amount: metrics.monthBalance },
        { label: `Ingresos de ${month}`, amount: metrics.monthIncome, op: '÷' },
        {
          label: 'Tasa de ahorro',
          text: metrics.monthIncome > 0 ? percent(metrics.savingsRate) : '—',
          op: '=',
          total: true,
        },
      ],
      notes:
        metrics.monthIncome > 0
          ? ['Es el porcentaje de lo que ingresaste que no gastaste.']
          : ['Sin ingresos en el mes no hay tasa que calcular: se muestra 0 %.'],
    },

    emergencyFund: {
      formula: 'Ahorrado en el fondo ÷ gasto medio mensual',
      rows: [
        { label: 'Ahorrado en el fondo de emergencia', amount: emergencyFund.saved },
        {
          label: `Gasto medio de los ${emergencyFund.averageWindow} meses completos anteriores`,
          amount: emergencyFund.averageMonthlyExpense,
          op: '÷',
        },
        {
          label: 'Meses cubiertos',
          text: `${emergencyFund.monthsCovered.toFixed(1)} m`,
          op: '=',
          total: true,
        },
      ],
      notes: [
        'Se promedian meses completos: incluir el mes en curso hundiría el promedio a principios de mes e inflaría la cobertura.',
        emergencyFund.goal
          ? `Fondo vinculado a la meta «${emergencyFund.goal.name}».`
          : 'Aún no has marcado ninguna meta como fondo de emergencia.',
      ],
    },

    cardUtilization: {
      formula: 'Media de (deuda ÷ cupo) de cada tarjeta',
      rows: [
        ...cards.map((card) => ({
          label: card.card.name,
          text: `${percent(card.utilization)} · ${money(card.currentBalance)} de ${money(card.card.creditLimit)}`,
        })),
        {
          label: 'Utilización media',
          text: cards.length > 0 ? percent(avgUtilization) : '—',
          op: '=',
          total: true,
        },
      ],
      notes: [
        'Es la media simple entre tarjetas, no ponderada por cupo.',
        'La deuda de cada tarjeta es consumos − pagos, sin bajar de cero.',
      ],
    },
  };
}
