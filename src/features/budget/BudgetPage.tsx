import { useMemo, useState } from 'react';
import { Plus, Wallet, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthNavigator } from '@/features/transactions/components/MonthNavigator';
import { BudgetDialog } from '@/features/budget/components/BudgetDialog';
import { useBudgetOverview } from '@/features/budget/hooks/useBudgetOverview';
import { useCategories } from '@/hooks/useCategories';
import { useSettings } from '@/hooks/useSettings';
import { deleteBudget } from '@/services/budgets.service';
import { handleError } from '@/lib/handle-error';
import { formatMoney, formatPercent } from '@/lib/format';
import { currentYearMonth } from '@/lib/date';
import { cn } from '@/lib/cn';
import type { BudgetStatus } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { YearMonth } from '@/types/common';
import type { BudgetId } from '@/types/ids';

/** Presupuesto (F07): límites mensuales por categoría con gastado, disponible,
 *  proyección a fin de mes y alertas. Todo derivado de los gastos reales. */
export function BudgetPage() {
  const settings = useSettings();
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());
  const overview = useBudgetOverview(yearMonth);
  const expenseCategories = useCategories('expense');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetStatus | undefined>(undefined);
  const [deleting, setDeleting] = useState<BudgetStatus | undefined>(undefined);

  const budgetedIds = useMemo(
    () => new Set((overview?.items ?? []).map((i) => i.budget.categoryId)),
    [overview],
  );
  const availableCategories = useMemo(
    () => expenseCategories.filter((c) => !budgetedIds.has(c.id)),
    [expenseCategories, budgetedIds],
  );

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (status: BudgetStatus) => {
    setEditing(status);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBudget(deleting.budget.id as BudgetId);
    } catch (error) {
      handleError(error, 'No se pudo eliminar el presupuesto');
    } finally {
      setDeleting(undefined);
    }
  };

  const loading = overview === undefined;
  const items = overview?.items ?? [];
  const hasBudgets = items.length > 0 || Boolean(overview?.global);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Presupuesto"
        description="Define límites mensuales y controla cuánto te queda disponible."
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo presupuesto</span>
          </Button>
        }
      />

      <MonthNavigator value={yearMonth} onChange={setYearMonth} />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !hasBudgets ? (
        <EmptyState
          icon={Wallet}
          title="Sin presupuestos este mes"
          description="Crea presupuestos por categoría para controlar tu gasto y recibir alertas."
          action={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </Button>
          }
        />
      ) : (
        <>
          {overview ? <BudgetSummary overview={overview} settings={settings} /> : null}

          {overview?.global ? (
            <BudgetRow
              status={overview.global}
              settings={settings}
              onEdit={openEdit}
              onDelete={setDeleting}
              isGlobal
            />
          ) : null}

          <div className="space-y-3">
            {items.map((status) => (
              <BudgetRow
                key={status.budget.id}
                status={status}
                settings={settings}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            ))}
          </div>
        </>
      )}

      <BudgetDialog
        yearMonth={yearMonth}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        availableCategories={availableCategories}
        editing={
          editing
            ? {
                budget: editing.budget,
                ...(editing.category ? { category: editing.category } : {}),
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Eliminar presupuesto"
        description="Se eliminará el límite de esta categoría para el mes."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function BudgetSummary({
  overview,
  settings,
}: {
  overview: NonNullable<ReturnType<typeof useBudgetOverview>>;
  settings: SettingsRow;
}) {
  const money = (v: number) =>
    formatMoney(v as BudgetStatus['spent'], {
      currency: settings.currency,
      locale: settings.locale,
    });
  const ratio = overview.totalBudget > 0 ? overview.totalSpent / overview.totalBudget : 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="grid grid-cols-3 gap-4 text-center sm:text-left">
          <div>
            <p className="text-xs text-muted-foreground">Presupuestado</p>
            <p className="text-lg font-semibold tabular-nums">{money(overview.totalBudget)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Gastado</p>
            <p className="text-lg font-semibold tabular-nums">{money(overview.totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Proyección fin de mes</p>
            <p className="text-lg font-semibold tabular-nums">{money(overview.totalProjected)}</p>
          </div>
        </div>
        <ProgressBar value={ratio} />
        <p className="text-xs text-muted-foreground">
          Has usado {formatPercent(ratio, settings.locale)} de tu presupuesto total.
        </p>
      </CardContent>
    </Card>
  );
}

function BudgetRow({
  status,
  settings,
  onEdit,
  onDelete,
  isGlobal = false,
}: {
  status: BudgetStatus;
  settings: SettingsRow;
  onEdit: (status: BudgetStatus) => void;
  onDelete: (status: BudgetStatus) => void;
  isGlobal?: boolean;
}) {
  const money = (v: number) =>
    formatMoney(v as BudgetStatus['spent'], {
      currency: settings.currency,
      locale: settings.locale,
    });
  const color = status.category?.color ?? 'hsl(var(--primary))';
  const barColor = status.overBudget
    ? 'hsl(var(--destructive))'
    : status.atRisk
      ? 'hsl(var(--warning))'
      : 'hsl(var(--success))';

  return (
    <Card className={cn(isGlobal && 'border-primary/40 bg-primary/5')}>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate font-medium">
              {isGlobal ? 'Presupuesto general' : (status.category?.name ?? 'Categoría')}
            </span>
            {status.overBudget ? (
              <Badge variant="destructive">Excedido</Badge>
            ) : status.atRisk ? (
              <Badge variant="warning">En riesgo</Badge>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(status)}
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(status)}
              aria-label="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ProgressBar value={status.ratio} color={barColor} />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>
            {money(status.spent)} de {money(status.budget.amount)}
          </span>
          <span>
            {status.remaining >= 0
              ? `${money(status.remaining)} disponible`
              : `${money(-status.remaining)} excedido`}
          </span>
          <span>Proyección: {money(status.projected)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
