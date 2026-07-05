import { db } from '@/db/db';
import { fromCents, sumCents } from '@/lib/money';
import { asCents } from '@/types/money';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { downloadBlob, fileDateStamp } from '@/lib/download';
import {
  dashboardMetricsQuery,
  goalsProgressQuery,
  cardsSummaryQuery,
} from '@/services/metrics.service';
import { currentYearMonth } from '@/lib/date';
import { APP_NAME } from '@/constants/config';
import type { SettingsRow } from '@/db/schema';
import type { Cents } from '@/types/money';
import type { IsoDate } from '@/types/common';

/**
 * Exportación a Excel (SheetJS) y PDF (jsPDF). Ambas librerías se cargan de forma
 * diferida (dynamic import) para no engordar el bundle principal (F11).
 */

/** Exporta todos los movimientos a un archivo .xlsx con una hoja de resumen. */
export async function exportTransactionsXlsx(settings: SettingsRow): Promise<void> {
  const XLSX = await import('xlsx');

  const [transactions, categories, methods] = await Promise.all([
    db.transactions.orderBy('date').reverse().toArray(),
    db.categories.toArray(),
    db.paymentMethods.toArray(),
  ]);

  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const methodName = new Map(methods.map((m) => [m.id, m.name]));

  const rows = transactions.map((t) => ({
    Fecha: t.date,
    Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
    Categoría: categoryName.get(t.categoryId) ?? '—',
    'Método de pago': t.paymentMethodId ? (methodName.get(t.paymentMethodId) ?? '—') : '—',
    Descripción: t.description,
    // Monto numérico (unidades) para que Excel lo trate como número.
    Monto: fromCents(t.amount),
    Etiquetas: t.tags.join(', '),
    Notas: t.notes ?? '',
  }));

  const totalIncome = sumCents(
    transactions.filter((t) => t.type === 'income').map((t) => t.amount),
  );
  const totalExpense = sumCents(
    transactions.filter((t) => t.type === 'expense').map((t) => t.amount),
  );

  const summary = [
    { Concepto: 'Moneda', Valor: settings.currency },
    { Concepto: 'Movimientos', Valor: transactions.length },
    { Concepto: 'Total ingresos', Valor: fromCents(totalIncome) },
    { Concepto: 'Total gastos', Valor: fromCents(totalExpense) },
    { Concepto: 'Balance', Valor: fromCents(asCents(totalIncome - totalExpense)) },
    {
      Concepto: 'Exportado',
      Valor: formatDate(fileDateStamp() as IsoDate, 'd MMM yyyy', settings.locale),
    },
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.json_to_sheet(rows);
  wsData['!cols'] = [
    { wch: 12 },
    { wch: 9 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 24 },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summary);
  wsSummary['!cols'] = [{ wch: 18 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
  XLSX.utils.book_append_sheet(wb, wsData, 'Movimientos');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${APP_NAME.toLowerCase()}-movimientos-${fileDateStamp()}.xlsx`);
}

/** Exporta un informe financiero (KPIs, metas y tarjetas) a PDF. */
export async function exportReportPdf(settings: SettingsRow): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const ym = currentYearMonth();
  const [metrics, goals, cards] = await Promise.all([
    dashboardMetricsQuery(ym),
    goalsProgressQuery(),
    cardsSummaryQuery(),
  ]);

  const money = (v: Cents) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });
  const doc = new jsPDF();
  const marginX = 14;

  doc.setFontSize(18);
  doc.text(`${APP_NAME} · Informe financiero`, marginX, 20);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generado el ${formatDate(fileDateStamp() as IsoDate, 'd MMM yyyy', settings.locale)}`,
    marginX,
    27,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 34,
    head: [['Indicador', 'Valor']],
    body: [
      ['Patrimonio total', money(metrics.netWorth)],
      ['Dinero disponible', money(metrics.available)],
      ['Total ahorrado', money(metrics.totalSaved)],
      ['Ingresos del mes', money(metrics.monthIncome)],
      ['Gastos del mes', money(metrics.monthExpense)],
      ['Balance del mes', money(metrics.monthBalance)],
      ['Tasa de ahorro', formatPercent(metrics.savingsRate, settings.locale)],
      ['Deuda de tarjetas', money(metrics.cardDebt)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [13, 148, 136] },
  });

  type AutoTableDoc = typeof doc & { lastAutoTable?: { finalY: number } };
  const afterKpis = (doc as AutoTableDoc).lastAutoTable?.finalY ?? 34;

  if (goals.length > 0) {
    doc.setFontSize(13);
    doc.text('Metas', marginX, afterKpis + 12);
    autoTable(doc, {
      startY: afterKpis + 16,
      head: [['Meta', 'Ahorrado', 'Objetivo', 'Progreso']],
      body: goals.map((g) => [
        g.goal.name,
        money(g.saved),
        money(g.goal.targetAmount),
        formatPercent(g.percent, settings.locale),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
    });
  }

  const afterGoals = (doc as AutoTableDoc).lastAutoTable?.finalY ?? afterKpis;

  if (cards.length > 0) {
    doc.setFontSize(13);
    doc.text('Tarjetas de crédito', marginX, afterGoals + 12);
    autoTable(doc, {
      startY: afterGoals + 16,
      head: [['Tarjeta', 'Deuda', 'Cupo', 'Utilización']],
      body: cards.map((c) => [
        c.card.name,
        money(c.currentBalance),
        money(c.card.creditLimit),
        formatPercent(c.utilization, settings.locale),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136] },
    });
  }

  doc.save(`${APP_NAME.toLowerCase()}-informe-${fileDateStamp()}.pdf`);
}
