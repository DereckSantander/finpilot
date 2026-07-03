import { useMemo } from 'react';
import { Pencil, Trash2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/cn';
import { useSettings } from '@/hooks/useSettings';
import type { TransactionRow, CategoryRow, PaymentMethodRow } from '@/db/schema';
import type { IsoDate } from '@/types/common';

interface TransactionListProps {
  transactions: TransactionRow[];
  categoriesById: Map<string, CategoryRow>;
  paymentMethodsById: Map<string, PaymentMethodRow>;
  onEdit: (transaction: TransactionRow) => void;
  onDelete: (transaction: TransactionRow) => void;
}

interface DateGroup {
  date: IsoDate;
  items: TransactionRow[];
}

/** Agrupa por fecha conservando el orden descendente ya aplicado. */
function groupByDate(transactions: TransactionRow[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const tx of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === tx.date) {
      last.items.push(tx);
    } else {
      groups.push({ date: tx.date, items: [tx] });
    }
  }
  return groups;
}

export function TransactionList({
  transactions,
  categoriesById,
  paymentMethodsById,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const settings = useSettings();
  const groups = useMemo(() => groupByDate(transactions), [transactions]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.date} className="space-y-2">
          <h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatDate(group.date, 'EEEE, d MMM yyyy', settings.locale)}
          </h3>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {group.items.map((tx, index) => {
              const category = categoriesById.get(tx.categoryId);
              const method = tx.paymentMethodId
                ? paymentMethodsById.get(tx.paymentMethodId)
                : undefined;
              const isIncome = tx.type === 'income';
              return (
                <div
                  key={tx.id}
                  className={cn(
                    'group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40',
                    index > 0 && 'border-t border-border',
                  )}
                >
                  <span
                    className="h-9 w-9 shrink-0 rounded-full"
                    style={{ backgroundColor: `${category?.color ?? '#94a3b8'}22` }}
                  >
                    <span
                      className="block h-full w-full rounded-full opacity-90"
                      style={{
                        backgroundColor: 'transparent',
                        border: `2px solid ${category?.color ?? '#94a3b8'}`,
                      }}
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {tx.description || category?.name || 'Sin categoría'}
                      </p>
                      {tx.attachmentId ? (
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{category?.name ?? 'Sin categoría'}</span>
                      {tx.time ? <span>· {tx.time}</span> : null}
                      {method ? <span>· {method.name}</span> : null}
                      {tx.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <span
                    className={cn(
                      'shrink-0 font-semibold tabular-nums',
                      isIncome ? 'text-success' : 'text-foreground',
                    )}
                  >
                    {formatMoney(tx.amount, {
                      currency: settings.currency,
                      locale: settings.locale,
                      signDisplay: 'never',
                    })}
                  </span>

                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(tx)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(tx)}
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
