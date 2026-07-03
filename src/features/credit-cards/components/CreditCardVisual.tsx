import { CreditCard as CardIcon, CalendarClock } from 'lucide-react';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { CARD_UTILIZATION_DANGER, CARD_UTILIZATION_WARN } from '@/constants/config';
import type { CardSummary } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CreditCardVisualProps {
  summary: CardSummary;
  settings: SettingsRow;
  onClick?: () => void;
}

function utilizationBar(utilization: number): string {
  if (utilization >= CARD_UTILIZATION_DANGER) return 'bg-red-400';
  if (utilization >= CARD_UTILIZATION_WARN) return 'bg-amber-300';
  return 'bg-emerald-300';
}

/** Representación visual de una tarjeta (estilo tarjeta física) con su deuda. */
export function CreditCardVisual({ summary, settings, onClick }: CreditCardVisualProps) {
  const { card } = summary;
  const money = (value: CardSummary['currentBalance']) =>
    formatMoney(value, { currency: settings.currency, locale: settings.locale });

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'relative block w-full overflow-hidden rounded-2xl p-5 text-left text-white shadow-md transition-transform',
        onClick &&
          'hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      )}
      style={{
        background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 55%, #0b0f11 140%)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-white/70">{card.bank}</p>
          <p className="text-lg font-semibold">{card.name}</p>
        </div>
        <CardIcon className="h-7 w-7 text-white/80" />
      </div>

      <div className="mt-6 space-y-1">
        <p className="text-xs text-white/70">Consumo actual</p>
        <p className="text-2xl font-semibold tabular-nums">{money(summary.currentBalance)}</p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className={cn('h-full rounded-full', utilizationBar(summary.utilization))}
          style={{ width: `${Math.min(summary.utilization, 1) * 100}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-white/80">
        <span>
          {formatPercent(summary.utilization, settings.locale)} de{' '}
          {formatMoney(card.creditLimit, {
            currency: settings.currency,
            locale: settings.locale,
            hideZeroDecimals: true,
          })}
        </span>
        <span className="flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {summary.currentBalance > 0
            ? `Pago ${formatDate(summary.dueDate, 'd MMM', settings.locale)}`
            : 'Al día'}
        </span>
      </div>
    </Wrapper>
  );
}
