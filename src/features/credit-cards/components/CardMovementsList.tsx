import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { formatMoney } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { CardMovement } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface CardMovementsListProps {
  movements: CardMovement[];
  settings: SettingsRow;
}

/** Lista de movimientos de la tarjeta: consumos (cargos) y pagos (abonos). */
export function CardMovementsList({ movements, settings }: CardMovementsListProps) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sin movimientos"
        description="Registra un consumo o un pago para ver el detalle aquí."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {movements.map((mv, index) => {
        const isPago = mv.kind === 'pago';
        return (
          <div
            key={`${mv.kind}-${mv.id}`}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              index > 0 && 'border-t border-border',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                isPago ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {isPago ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{isPago ? 'Pago' : mv.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(mv.date, 'd MMM yyyy', settings.locale)}
              </p>
            </div>
            <span
              className={cn(
                'shrink-0 font-semibold tabular-nums',
                isPago ? 'text-success' : 'text-foreground',
              )}
            >
              {isPago ? '−' : '+'}
              {formatMoney(mv.amount, {
                currency: settings.currency,
                locale: settings.locale,
                signDisplay: 'never',
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
