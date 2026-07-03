import { CreditCard, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/ui/button';
import { formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants/routes';
import { CARD_UTILIZATION_DANGER, CARD_UTILIZATION_WARN } from '@/constants/config';
import type { CardSummary } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CardsWidgetProps {
  cards: CardSummary[];
  settings: SettingsRow;
}

function utilizationColor(utilization: number): string {
  if (utilization >= CARD_UTILIZATION_DANGER) return 'hsl(var(--destructive))';
  if (utilization >= CARD_UTILIZATION_WARN) return 'hsl(var(--warning))';
  return 'hsl(var(--success))';
}

/** Widget: resumen de tarjetas de crédito (cupo, utilización, días para pagar). */
export function CardsWidget({ cards, settings }: CardsWidgetProps) {
  return (
    <DashboardSection
      title="Tarjetas"
      icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
      to={ROUTES.cards}
    >
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin tarjetas"
          description="Registra tus tarjetas para controlar cupos y pagos."
          action={
            <Button asChild size="sm">
              <Link to={ROUTES.cards}>Añadir tarjeta</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {cards.slice(0, 3).map((summary) => (
            <li key={summary.card.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-6 w-6 rounded-md"
                    style={{ backgroundColor: summary.card.color }}
                  />
                  <div className="leading-tight">
                    <p className="text-sm font-medium">{summary.card.name}</p>
                    <p className="text-xs text-muted-foreground">{summary.card.bank}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(summary.currentBalance, {
                      currency: settings.currency,
                      locale: settings.locale,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de{' '}
                    {formatMoney(summary.card.creditLimit, {
                      currency: settings.currency,
                      locale: settings.locale,
                      hideZeroDecimals: true,
                    })}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={summary.utilization}
                color={utilizationColor(summary.utilization)}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatPercent(summary.utilization, settings.locale)} de utilización</span>
                <span
                  className={cn(
                    'flex items-center gap-1',
                    summary.daysUntilDue <= 5 && summary.currentBalance > 0 && 'text-warning',
                  )}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {summary.daysUntilDue === 0
                    ? 'Vence hoy'
                    : `${summary.daysUntilDue} día(s) para pagar`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
