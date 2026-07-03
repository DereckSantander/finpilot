import { AlertTriangle, ShieldAlert, CheckCircle2, type LucideIcon } from 'lucide-react';
import { formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { CARD_DUE_SOON_DAYS } from '@/constants/config';
import type { CardSummary } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CardAlertsProps {
  cards: CardSummary[];
  settings: SettingsRow;
}

interface Alert {
  id: string;
  level: 'danger' | 'warning';
  message: string;
}

const META: Record<Alert['level'], { icon: LucideIcon; className: string }> = {
  danger: { icon: ShieldAlert, className: 'bg-destructive/10 text-destructive' },
  warning: { icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
};

/** Alertas del módulo de tarjetas: vencimientos próximos y utilización alta. */
export function CardAlerts({ cards, settings }: CardAlertsProps) {
  const alerts: Alert[] = [];
  for (const c of cards) {
    if (c.currentBalance > 0 && c.daysUntilDue <= CARD_DUE_SOON_DAYS) {
      alerts.push({
        id: `due-${c.card.id}`,
        level: c.daysUntilDue <= 2 ? 'danger' : 'warning',
        message:
          c.daysUntilDue === 0
            ? `Hoy vence el pago de ${c.card.name}.`
            : `${c.card.name} vence en ${c.daysUntilDue} día(s) (${formatDate(c.dueDate, 'd MMM', settings.locale)}).`,
      });
    }
    if (c.utilization >= 0.7) {
      alerts.push({
        id: `util-${c.card.id}`,
        level: c.utilization >= 0.9 ? 'danger' : 'warning',
        message: `Usas el ${formatPercent(c.utilization, settings.locale)} del cupo de ${c.card.name}.`,
      });
    }
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Tus tarjetas están al día. No hay alertas.</span>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const meta = META[alert.level];
        const Icon = meta.icon;
        return (
          <li
            key={alert.id}
            className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-2.5 text-sm"
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                meta.className,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span>{alert.message}</span>
          </li>
        );
      })}
    </ul>
  );
}
