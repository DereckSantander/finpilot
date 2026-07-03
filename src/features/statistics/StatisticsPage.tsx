import { useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressBar } from '@/components/common/ProgressBar';
import { BarTrendChart } from '@/components/charts/BarTrendChart';
import { AreaChart } from '@/components/charts/AreaChart';
import { BreakdownPanel } from '@/features/statistics/components/BreakdownPanel';
import { ProjectionsPanel } from '@/features/statistics/components/ProjectionsPanel';
import {
  useYearlyTotals,
  useMonthlyForYear,
  useCategoryYear,
  useMethodYear,
  useNetWorthSeries,
  useGoalsStat,
  useCardsStat,
  useCurrentMetrics,
} from '@/features/statistics/hooks/useStatistics';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney, formatPercent } from '@/lib/format';
import { sumCents } from '@/lib/money';
import { cn } from '@/lib/cn';
import { asCents, type Cents } from '@/types/money';
import type { SettingsRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { TrendPoint } from '@/services/metrics.service';

type Tab =
  | 'resumen'
  | 'mensual'
  | 'anual'
  | 'categorias'
  | 'metodos'
  | 'metas'
  | 'tarjetas'
  | 'proyecciones';

const TABS: { value: Tab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual', label: 'Anual' },
  { value: 'categorias', label: 'Categorías' },
  { value: 'metodos', label: 'Métodos' },
  { value: 'metas', label: 'Metas' },
  { value: 'tarjetas', label: 'Tarjetas' },
  { value: 'proyecciones', label: 'Proyecciones' },
];

const YEAR_SCOPED: Tab[] = ['mensual', 'categorias', 'metodos'];
const TYPE_SCOPED: Tab[] = ['categorias', 'metodos'];

/** Estadísticas (F08): analítica interactiva del patrimonio y los movimientos. */
export function StatisticsPage() {
  const settings = useSettings();
  const [tab, setTab] = useState<Tab>('resumen');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [type, setType] = useState<TransactionType>('expense');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estadísticas"
        description="Analiza tu patrimonio, ingresos, gastos y proyecciones."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="flex w-full flex-wrap justify-start">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {(YEAR_SCOPED.includes(tab) || TYPE_SCOPED.includes(tab)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {YEAR_SCOPED.includes(tab) ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setYear((y) => y - 1)}
                aria-label="Año anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[4rem] text-center text-sm font-medium">{year}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setYear((y) => y + 1)}
                aria-label="Año siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span />
          )}
          {TYPE_SCOPED.includes(tab) ? <TypeToggle value={type} onChange={setType} /> : null}
        </div>
      )}

      {tab === 'resumen' ? <ResumenTab settings={settings} /> : null}
      {tab === 'mensual' ? <MensualTab year={year} settings={settings} /> : null}
      {tab === 'anual' ? <AnualTab settings={settings} /> : null}
      {tab === 'categorias' ? <CategoriasTab year={year} type={type} settings={settings} /> : null}
      {tab === 'metodos' ? <MetodosTab year={year} type={type} settings={settings} /> : null}
      {tab === 'metas' ? <MetasTab settings={settings} /> : null}
      {tab === 'tarjetas' ? <TarjetasTab settings={settings} /> : null}
      {tab === 'proyecciones' ? <ProyeccionesTab settings={settings} /> : null}
    </div>
  );
}

function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType;
  onChange: (v: TransactionType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {(['expense', 'income'] as TransactionType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t === 'expense' ? 'Gastos' : 'Ingresos'}
        </button>
      ))}
    </div>
  );
}

function ChartCard({
  title,
  height = 'h-64',
  children,
}: {
  title: string;
  height?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={height}>{children}</div>
      </CardContent>
    </Card>
  );
}

function Loading() {
  return <Skeleton className="h-64 w-full rounded-xl" />;
}

// --- Tabs -----------------------------------------------------------------

function ResumenTab({ settings }: { settings: SettingsRow }) {
  const metrics = useCurrentMetrics();
  const netWorth = useNetWorthSeries(12);
  const money = (v: Cents) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  if (!metrics) return <Loading />;

  const kpis = [
    { icon: Landmark, label: 'Patrimonio', value: money(metrics.netWorth), intent: 'primary' },
    { icon: Wallet, label: 'Disponible', value: money(metrics.available) },
    {
      icon: TrendingUp,
      label: 'Ingresos (mes)',
      value: money(metrics.monthIncome),
      intent: 'positive',
    },
    {
      icon: TrendingDown,
      label: 'Gastos (mes)',
      value: money(metrics.monthExpense),
      intent: 'negative',
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="flex items-start justify-between p-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p
                    className={cn(
                      'truncate text-lg font-semibold tabular-nums',
                      'intent' in k && k.intent === 'primary' && 'text-primary',
                      'intent' in k && k.intent === 'positive' && 'text-success',
                      'intent' in k && k.intent === 'negative' && 'text-destructive',
                    )}
                  >
                    {k.value}
                  </p>
                </div>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ChartCard title="Evolución del patrimonio (12 meses)">
        {netWorth ? (
          <AreaChart
            labels={netWorth.map((p) => p.label)}
            values={netWorth.map((p) => p.netWorth)}
            currency={settings.currency}
            locale={settings.locale}
          />
        ) : (
          <Loading />
        )}
      </ChartCard>
    </div>
  );
}

function YearSummary({ points, settings }: { points: TrendPoint[]; settings: SettingsRow }) {
  const income = sumCents(points.map((p) => p.income));
  const expense = sumCents(points.map((p) => p.expense));
  const balance = asCents(income - expense);
  const money = (v: Cents) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });
  return (
    <div className="grid grid-cols-3 gap-4">
      <SummaryChip label="Ingresos" value={money(income)} className="text-success" />
      <SummaryChip label="Gastos" value={money(expense)} className="text-destructive" />
      <SummaryChip
        label="Balance"
        value={money(balance)}
        className={balance >= 0 ? 'text-success' : 'text-destructive'}
      />
    </div>
  );
}

function SummaryChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('truncate text-lg font-semibold tabular-nums', className)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MensualTab({ year, settings }: { year: number; settings: SettingsRow }) {
  const monthly = useMonthlyForYear(year);
  if (!monthly) return <Loading />;
  const hasData = monthly.some((m) => m.income > 0 || m.expense > 0);

  return (
    <div className="space-y-4">
      <YearSummary points={monthly} settings={settings} />
      <ChartCard title={`Ingresos vs. gastos por mes · ${year}`}>
        {hasData ? (
          <BarTrendChart
            data={monthly.map((m) => ({ label: m.label, income: m.income, expense: m.expense }))}
            currency={settings.currency}
            locale={settings.locale}
          />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Sin datos"
            description={`No hay movimientos en ${year}.`}
          />
        )}
      </ChartCard>
    </div>
  );
}

function AnualTab({ settings }: { settings: SettingsRow }) {
  const yearly = useYearlyTotals(5);
  if (!yearly) return <Loading />;
  const hasData = yearly.some((y) => y.income > 0 || y.expense > 0);

  return (
    <div className="space-y-4">
      <ChartCard title="Comparación anual (ingresos vs. gastos)">
        {hasData ? (
          <BarTrendChart
            data={yearly.map((y) => ({ label: y.label, income: y.income, expense: y.expense }))}
            currency={settings.currency}
            locale={settings.locale}
          />
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="Sin datos"
            description="Registra movimientos para comparar años."
          />
        )}
      </ChartCard>

      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-4 gap-2 border-b border-border px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Año</span>
            <span className="text-right">Ingresos</span>
            <span className="text-right">Gastos</span>
            <span className="text-right">Balance</span>
          </div>
          {yearly
            .slice()
            .reverse()
            .map((y) => (
              <div
                key={y.year}
                className="grid grid-cols-4 gap-2 border-b border-border/60 px-4 py-2.5 text-sm tabular-nums last:border-0"
              >
                <span>{y.label}</span>
                <span className="text-right text-success">
                  {formatMoney(y.income, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span className="text-right text-destructive">
                  {formatMoney(y.expense, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span className="text-right font-medium">
                  {formatMoney(y.balance, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                    signDisplay: 'exceptZero',
                  })}
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriasTab({
  year,
  type,
  settings,
}: {
  year: number;
  type: TransactionType;
  settings: SettingsRow;
}) {
  const slices = useCategoryYear(year, type);
  if (!slices) return <Loading />;
  return (
    <Card>
      <CardContent className="p-6">
        <BreakdownPanel
          items={slices.map((s) => ({
            id: s.categoryId,
            name: s.name,
            value: s.total,
            percent: s.percent,
            color: s.color,
          }))}
          settings={settings}
          emptyLabel={`No hay ${type === 'expense' ? 'gastos' : 'ingresos'} en ${year}.`}
        />
      </CardContent>
    </Card>
  );
}

function MetodosTab({
  year,
  type,
  settings,
}: {
  year: number;
  type: TransactionType;
  settings: SettingsRow;
}) {
  const slices = useMethodYear(year, type);
  if (!slices) return <Loading />;
  return (
    <Card>
      <CardContent className="p-6">
        <BreakdownPanel
          items={slices.map((s) => ({
            id: s.methodId,
            name: s.name,
            value: s.total,
            percent: s.percent,
            color: s.color,
          }))}
          settings={settings}
          emptyLabel={`No hay movimientos con método de pago en ${year}.`}
        />
      </CardContent>
    </Card>
  );
}

function MetasTab({ settings }: { settings: SettingsRow }) {
  const goals = useGoalsStat();
  if (!goals) return <Loading />;
  if (goals.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sin metas"
        description="Crea metas para ver su distribución."
      />
    );
  }
  const totalSaved = goals.reduce((acc, g) => acc + g.saved, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ahorro por meta</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <BreakdownPanel
            items={goals.map((g) => ({
              id: g.goal.id,
              name: g.goal.name,
              value: g.saved,
              percent: totalSaved > 0 ? g.saved / totalSaved : 0,
              color: g.goal.color,
            }))}
            settings={settings}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progreso de las metas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {goals.map((g) => (
            <div key={g.goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{g.goal.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPercent(g.percent, settings.locale)}
                </span>
              </div>
              <ProgressBar value={g.percent} color={g.goal.color} />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>
                  {formatMoney(g.saved, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span>
                  {formatMoney(g.goal.targetAmount, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TarjetasTab({ settings }: { settings: SettingsRow }) {
  const cards = useCardsStat();
  if (!cards) return <Loading />;
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sin tarjetas"
        description="Registra tarjetas para ver estadísticas."
      />
    );
  }
  const totalDebt = cards.reduce((acc, c) => acc + c.currentBalance, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Deuda por tarjeta</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {totalDebt > 0 ? (
            <BreakdownPanel
              items={cards
                .filter((c) => c.currentBalance > 0)
                .map((c) => ({
                  id: c.card.id,
                  name: c.card.name,
                  value: c.currentBalance,
                  percent: totalDebt > 0 ? c.currentBalance / totalDebt : 0,
                  color: c.card.color,
                }))}
              settings={settings}
            />
          ) : (
            <EmptyState
              icon={Wallet}
              title="Sin deuda"
              description="Todas tus tarjetas están al día."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Utilización de cupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cards.map((c) => (
            <div key={c.card.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">{c.card.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPercent(c.utilization, settings.locale)}
                </span>
              </div>
              <ProgressBar value={c.utilization} color={c.card.color} />
              <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                <span>
                  {formatMoney(c.currentBalance, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span>
                  {formatMoney(c.card.creditLimit, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ProyeccionesTab({ settings }: { settings: SettingsRow }) {
  const metrics = useCurrentMetrics();
  if (!metrics) return <Loading />;

  const suggestedMonthly = Math.max(metrics.monthBalance, settings.monthlySavingsTarget, 0);

  return (
    <ProjectionsPanel
      initialNetWorth={Math.max(metrics.netWorth, 0)}
      suggestedMonthly={suggestedMonthly}
      settings={settings}
    />
  );
}
