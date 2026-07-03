import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Trash2, History } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatMoney } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { deleteContribution } from '@/services/goalContributions.service';
import { handleError } from '@/lib/handle-error';
import type { GoalContributionRow } from '@/db/schema';
import type { SettingsRow } from '@/db/schema';
import type { GoalContributionId } from '@/types/ids';

interface ContributionsListProps {
  contributions: GoalContributionRow[];
  settings: SettingsRow;
}

/** Historial de aportes/retiros de una meta, con borrado. */
export function ContributionsList({ contributions, settings }: ContributionsListProps) {
  const [deleting, setDeleting] = useState<GoalContributionRow | undefined>(undefined);

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteContribution(deleting.id as GoalContributionId);
    } catch (error) {
      handleError(error, 'No se pudo eliminar el aporte');
    } finally {
      setDeleting(undefined);
    }
  };

  if (contributions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="Sin movimientos"
        description="Asigna dinero a la meta para ver el historial aquí."
      />
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {contributions.map((c, index) => {
          const isWithdraw = c.amount < 0;
          return (
            <div
              key={c.id}
              className={cn(
                'group flex items-center gap-3 px-4 py-3',
                index > 0 && 'border-t border-border',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                  isWithdraw ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success',
                )}
              >
                {isWithdraw ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {c.note || (isWithdraw ? 'Retiro' : 'Aporte')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(c.date, 'd MMM yyyy', settings.locale)}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 font-semibold tabular-nums',
                  isWithdraw ? 'text-muted-foreground' : 'text-success',
                )}
              >
                {isWithdraw ? '−' : '+'}
                {formatMoney(Math.abs(c.amount) as GoalContributionRow['amount'], {
                  currency: settings.currency,
                  locale: settings.locale,
                  signDisplay: 'never',
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100"
                onClick={() => setDeleting(c)}
                aria-label="Eliminar aporte"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Eliminar aporte"
        description="Se ajustará el ahorro acumulado de la meta."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
      />
    </>
  );
}
