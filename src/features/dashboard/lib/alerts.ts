import { formatMoney, formatPercent } from '@/lib/format';
import { CARD_DUE_SOON_DAYS } from '@/constants/config';
import type {
  DashboardMetrics,
  CardSummary,
  EmergencyFundStatus,
} from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

export type AlertLevel = 'success' | 'info' | 'warning' | 'danger';

export interface DashboardAlert {
  id: string;
  level: AlertLevel;
  message: string;
}

const SEVERITY: Record<AlertLevel, number> = { danger: 0, warning: 1, info: 2, success: 3 };

/**
 * Genera alertas financieras a partir de los datos reales (ADR-0007: derivadas,
 * no simuladas). Cubre las familias de aviso descritas en el PDF: vencimiento y
 * utilización de tarjetas, fondo de emergencia, balance y ritmo de ahorro.
 */
export function computeAlerts(params: {
  metrics: DashboardMetrics;
  cards: CardSummary[];
  emergencyFund: EmergencyFundStatus;
  settings: SettingsRow;
}): DashboardAlert[] {
  const { metrics, cards, emergencyFund, settings } = params;
  const currency = settings.currency;
  const locale = settings.locale;
  const alerts: DashboardAlert[] = [];

  // Tarjetas: vencimiento próximo y utilización alta.
  for (const summary of cards) {
    if (summary.currentBalance > 0 && summary.daysUntilDue <= CARD_DUE_SOON_DAYS) {
      alerts.push({
        id: `card-due-${summary.card.id}`,
        level: summary.daysUntilDue <= 2 ? 'danger' : 'warning',
        message:
          summary.daysUntilDue === 0
            ? `Hoy vence el pago de tu tarjeta ${summary.card.name}.`
            : `Tu tarjeta ${summary.card.name} vence en ${summary.daysUntilDue} día(s).`,
      });
    }
    if (summary.utilization >= 0.7) {
      alerts.push({
        id: `card-util-${summary.card.id}`,
        level: summary.utilization >= 0.9 ? 'danger' : 'warning',
        message: `Estás utilizando el ${formatPercent(summary.utilization, locale)} del cupo de ${summary.card.name}.`,
      });
    }
  }

  // Fondo de emergencia.
  if (emergencyFund.goal && emergencyFund.averageMonthlyExpense > 0) {
    const target = settings.emergencyFund.targetMonths[0] ?? 3;
    if (emergencyFund.monthsCovered < target) {
      alerts.push({
        id: 'emergency-low',
        level: emergencyFund.monthsCovered < 1 ? 'danger' : 'warning',
        message: `Tu fondo de emergencia cubre únicamente ${emergencyFund.monthsCovered.toFixed(1)} meses de gastos.`,
      });
    }
  }

  // Balance y ritmo de ahorro del mes.
  if (metrics.monthIncome > 0) {
    if (metrics.monthBalance < 0) {
      alerts.push({
        id: 'negative-balance',
        level: 'danger',
        message: `Este mes gastaste ${formatMoney(
          Math.abs(metrics.monthBalance) as DashboardMetrics['monthBalance'],
          { currency, locale },
        )} más de lo que ingresaste.`,
      });
    } else {
      const targetRate =
        metrics.monthIncome > 0 ? settings.monthlySavingsTarget / metrics.monthIncome : 0;
      if (metrics.savingsRate >= targetRate && targetRate > 0) {
        alerts.push({
          id: 'on-track',
          level: 'success',
          message: `Vas por buen camino: ahorraste el ${formatPercent(metrics.savingsRate, locale)} de tus ingresos este mes.`,
        });
      }
    }
  } else if (metrics.transactionsCount === 0) {
    alerts.push({
      id: 'no-activity',
      level: 'info',
      message: 'Aún no registras movimientos. Empieza añadiendo un ingreso o un gasto.',
    });
  }

  return alerts.sort((a, b) => SEVERITY[a.level] - SEVERITY[b.level]);
}
