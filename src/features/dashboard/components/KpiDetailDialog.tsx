import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { KpiExplanation, KpiRow } from '@/features/dashboard/lib/kpiExplain';
import type { SettingsRow } from '@/db/schema';

interface KpiDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  explanation: KpiExplanation;
  settings: SettingsRow;
}

/**
 * Detalle de un KPI del dashboard: la fórmula, las partes que la componen y las
 * reglas que no se ven en la cifra (qué se excluye y por qué). El contenido lo
 * arma `buildKpiExplanations`; aquí solo se pinta.
 */
export function KpiDetailDialog({
  open,
  onOpenChange,
  title,
  explanation,
  settings,
}: KpiDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{explanation.formula}</DialogDescription>
        </DialogHeader>

        <dl className="space-y-0">
          {explanation.rows.map((row) => (
            <Row key={row.label} row={row} settings={settings} />
          ))}
        </dl>

        {explanation.notes && explanation.notes.length > 0 ? (
          <ul className="space-y-2 rounded-lg bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
            {explanation.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Row({ row, settings }: { row: KpiRow; settings: SettingsRow }) {
  const value =
    row.amount !== undefined
      ? formatMoney(row.amount, { currency: settings.currency, locale: settings.locale })
      : (row.text ?? '—');

  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-2 text-sm',
        row.total && 'mt-1 border-t border-border pt-3 font-semibold',
      )}
    >
      <dt className={cn('flex min-w-0 gap-2', !row.total && 'text-muted-foreground')}>
        <span className="w-3 shrink-0 tabular-nums" aria-hidden>
          {row.op ?? ''}
        </span>
        <span className="min-w-0">{row.label}</span>
      </dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}
