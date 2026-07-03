import { useMemo, useState } from 'react';
import { Plus, Search, List, CalendarDays, ChartPie, TrendingUp, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthNavigator } from '@/features/transactions/components/MonthNavigator';
import { TransactionList } from '@/features/transactions/components/TransactionList';
import { TransactionDialog } from '@/features/transactions/components/TransactionDialog';
import {
  TransactionFilters,
  type TransactionFilterValue,
} from '@/features/transactions/components/TransactionFilters';
import { TransactionCalendar } from '@/features/transactions/components/TransactionCalendar';
import { TransactionStats } from '@/features/transactions/components/TransactionStats';
import { useTransactions, useMonthlyTotals } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useTags } from '@/hooks/useTags';
import { useCategoryBreakdown } from '@/features/transactions/hooks/useTransactionStats';
import { useSettings } from '@/hooks/useSettings';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { deleteTransaction } from '@/services/transactions.service';
import { handleError } from '@/lib/handle-error';
import { formatMoney } from '@/lib/format';
import { currentYearMonth, todayIso, toYearMonth, formatDate } from '@/lib/date';
import { ZERO_CENTS } from '@/types/money';
import type { TransactionRow } from '@/db/schema';
import type { TransactionType, YearMonth, IsoDate } from '@/types/common';
import type { CategoryId, PaymentMethodId } from '@/types/ids';

type ViewMode = 'list' | 'calendar' | 'stats';

interface TransactionsViewProps {
  type: TransactionType;
}

const COPY: Record<
  TransactionType,
  { title: string; description: string; newLabel: string; emptyTitle: string; emptyHint: string }
> = {
  income: {
    title: 'Ingresos',
    description: 'Registra, filtra y analiza tus ingresos.',
    newLabel: 'Nuevo ingreso',
    emptyTitle: 'Sin ingresos este mes',
    emptyHint: 'Registra tu sueldo, bonificaciones u otros ingresos para verlos aquí.',
  },
  expense: {
    title: 'Gastos',
    description: 'Registra, filtra y analiza en qué se va tu dinero.',
    newLabel: 'Nuevo gasto',
    emptyTitle: 'Sin gastos este mes',
    emptyHint: 'Registra un gasto para empezar a controlar tu presupuesto.',
  },
};

/**
 * Vista completa de movimientos (Ingresos/Gastos): lista, calendario y
 * estadísticas, con búsqueda y filtros. Todo reactivo desde IndexedDB.
 */
export function TransactionsView({ type }: TransactionsViewProps) {
  const copy = COPY[type];
  const settings = useSettings();

  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [filters, setFilters] = useState<TransactionFilterValue>({});
  const [view, setView] = useState<ViewMode>('list');
  const [selectedDate, setSelectedDate] = useState<IsoDate>(() => todayIso());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionRow | undefined>(undefined);
  const [deleting, setDeleting] = useState<TransactionRow | undefined>(undefined);

  const transactions = useTransactions({
    type,
    yearMonth,
    ...(filters.categoryId ? { categoryId: filters.categoryId as CategoryId } : {}),
    ...(filters.paymentMethodId
      ? { paymentMethodId: filters.paymentMethodId as PaymentMethodId }
      : {}),
    ...(filters.tag ? { tag: filters.tag } : {}),
    ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
  });
  const totals = useMonthlyTotals(yearMonth);
  const categories = useCategories(type);
  const paymentMethods = usePaymentMethods();
  const tags = useTags();
  const breakdown = useCategoryBreakdown(yearMonth, type);

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const paymentMethodsById = useMemo(
    () => new Map(paymentMethods.map((m) => [m.id, m])),
    [paymentMethods],
  );

  const total =
    type === 'income' ? (totals?.income ?? ZERO_CENTS) : (totals?.expense ?? ZERO_CENTS);
  const loading = transactions === undefined;
  const list = useMemo(() => transactions ?? [], [transactions]);
  const dayTransactions = useMemo(
    () => list.filter((tx) => tx.date === selectedDate),
    [list, selectedDate],
  );

  const changeMonth = (ym: YearMonth) => {
    setYearMonth(ym);
    setSelectedDate(toYearMonth(todayIso()) === ym ? todayIso() : (`${ym}-01` as IsoDate));
  };

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };
  const openEdit = (transaction: TransactionRow) => {
    setEditing(transaction);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTransaction(deleting.id);
    } catch (error) {
      handleError(error, 'No se pudo eliminar el movimiento');
    } finally {
      setDeleting(undefined);
    }
  };

  const filtersActive =
    Boolean(filters.categoryId || filters.paymentMethodId || filters.tag) ||
    debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{copy.newLabel}</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthNavigator value={yearMonth} onChange={changeMonth} />
        <Card className="w-full sm:w-auto">
          <CardContent className="flex items-center justify-between gap-6 px-4 py-3">
            <span className="text-sm text-muted-foreground">
              Total de {type === 'income' ? 'ingresos' : 'gastos'}
            </span>
            <span className="text-lg font-semibold tabular-nums">
              {formatMoney(total, { currency: settings.currency, locale: settings.locale })}
            </span>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-4 w-4" /> Lista
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-4 w-4" /> Calendario
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <ChartPie className="h-4 w-4" /> Estadísticas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view !== 'stats' ? (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar…"
              className="pl-9"
            />
          </div>
          <TransactionFilters
            categories={categories}
            paymentMethods={paymentMethods}
            tags={tags}
            value={filters}
            onChange={setFilters}
          />
        </div>
      ) : null}

      {view === 'list' ? (
        loading ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <EmptyState
            icon={type === 'income' ? TrendingUp : Receipt}
            title={filtersActive ? 'Sin resultados' : copy.emptyTitle}
            description={filtersActive ? 'Prueba con otros filtros o términos.' : copy.emptyHint}
            action={
              filtersActive ? undefined : (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {copy.newLabel}
                </Button>
              )
            }
          />
        ) : (
          <TransactionList
            transactions={list}
            categoriesById={categoriesById}
            paymentMethodsById={paymentMethodsById}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        )
      ) : null}

      {view === 'calendar' ? (
        <div className="space-y-4">
          <TransactionCalendar
            transactions={list}
            yearMonth={yearMonth}
            type={type}
            settings={settings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <div>
            <h3 className="mb-2 px-1 text-sm font-medium capitalize">
              {formatDate(selectedDate, 'EEEE, d MMM yyyy', settings.locale)}
            </h3>
            {dayTransactions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sin movimientos este día.
              </p>
            ) : (
              <TransactionList
                transactions={dayTransactions}
                categoriesById={categoriesById}
                paymentMethodsById={paymentMethodsById}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
            )}
          </div>
        </div>
      ) : null}

      {view === 'stats' ? (
        <TransactionStats
          type={type}
          yearMonth={yearMonth}
          breakdown={breakdown ?? []}
          settings={settings}
        />
      ) : null}

      <TransactionDialog
        type={type}
        initial={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title="Eliminar movimiento"
        description="Esta acción no se puede deshacer. El movimiento y su comprobante se eliminarán."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
