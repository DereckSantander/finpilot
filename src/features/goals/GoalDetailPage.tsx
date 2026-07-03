import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Wallet,
  TrendingUp,
  CalendarCheck,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EmptyState } from '@/components/common/EmptyState';
import { DonutChart } from '@/components/charts/DonutChart';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog';
import { ContributionDialog } from '@/features/goals/components/ContributionDialog';
import { ContributionsList } from '@/features/goals/components/ContributionsList';
import { GoalContributionsChart } from '@/features/goals/components/GoalContributionsChart';
import { GoalProjectionChart } from '@/features/goals/components/GoalProjectionChart';
import { goalIcon } from '@/features/goals/lib/icons';
import {
  useGoalDetail,
  useGoalContributions,
  useGoalMonthly,
  useGoalProjection,
} from '@/features/goals/hooks/useGoalsData';
import { useSettings } from '@/hooks/useSettings';
import { deleteGoal } from '@/services/goals.service';
import { handleError } from '@/lib/handle-error';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { ROUTES } from '@/constants/routes';
import { themeColor } from '@/lib/theme-colors';
import type { GoalDetail } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { GoalId } from '@/types/ids';

/** Detalle de una meta (F05): progreso, asignación, gráficos y proyección. */
export function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const goalId = id as GoalId;
  const navigate = useNavigate();
  const settings = useSettings();

  const detail = useGoalDetail(goalId);
  const contributions = useGoalContributions(goalId);
  const monthly = useGoalMonthly(goalId, 6);
  const projection = useGoalProjection(goalId);

  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (detail === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const { goal } = detail;
  const Icon = goalIcon(goal.icon);

  const money = (v: GoalDetail['saved']) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const remove = async () => {
    try {
      await deleteGoal(goal.id);
      toast.success('Meta eliminada');
      navigate(ROUTES.goals);
    } catch (error) {
      handleError(error, 'No se pudo eliminar la meta');
    }
  };

  const hasContribData = (monthly ?? []).some((m) => m.amount !== 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 pl-1">
          <Link to={ROUTES.goals}>
            <ArrowLeft className="h-4 w-4" />
            Metas
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setAssignOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Asignar dinero</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]">
        {/* Progreso */}
        <Card>
          <CardContent className="flex flex-col items-center p-6 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
            >
              <Icon className="h-7 w-7" />
            </span>
            <h1 className="mt-3 text-xl font-semibold">{goal.name}</h1>
            {goal.isEmergencyFund ? (
              <Badge variant="secondary" className="mt-1">
                Fondo de emergencia
              </Badge>
            ) : null}

            <div className="relative mt-5 h-44 w-44">
              <DonutChart
                data={[
                  { label: 'Ahorrado', value: detail.saved, color: goal.color },
                  {
                    label: 'Restante',
                    value: detail.remaining,
                    color: themeColor('--muted'),
                  },
                ]}
                currency={settings.currency}
                locale={settings.locale}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatPercent(detail.percent, settings.locale)}
                </span>
                {detail.reached ? (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Lograda
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 w-full space-y-2">
              <ProgressBar value={detail.percent} color={goal.color} />
              <div className="flex items-center justify-between text-sm tabular-nums">
                <span className="font-medium">{money(detail.saved)}</span>
                <span className="text-muted-foreground">{money(goal.targetAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs + proyección */}
        <div className="space-y-4">
          <KpiGrid detail={detail} settings={settings} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Proyección hacia el objetivo</CardTitle>
            </CardHeader>
            <CardContent>
              {projection && projection.actual.some((v) => v && v > 0) ? (
                <div className="h-56">
                  <GoalProjectionChart
                    projection={projection}
                    color={goal.color}
                    settings={settings}
                  />
                </div>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="Aún sin datos para proyectar"
                  description="Asigna dinero para estimar cuándo alcanzarás tu meta."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aportes por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {hasContribData ? (
              <div className="h-56">
                <GoalContributionsChart
                  points={monthly ?? []}
                  color={goal.color}
                  settings={settings}
                />
              </div>
            ) : (
              <EmptyState
                icon={Flag}
                title="Sin aportes recientes"
                description="Los aportes de los últimos meses aparecerán aquí."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historial de aportes</CardTitle>
          </CardHeader>
          <CardContent>
            <ContributionsList contributions={contributions ?? []} settings={settings} />
          </CardContent>
        </Card>
      </div>

      <ContributionDialog goalId={goalId} open={assignOpen} onOpenChange={setAssignOpen} />
      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} initial={goal} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar meta"
        description="Se eliminará la meta y todos sus aportes. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

function KpiGrid({ detail, settings }: { detail: GoalDetail; settings: SettingsRow }) {
  const money = (v: GoalDetail['saved']) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const rows: { icon: typeof Wallet; label: string; value: string; hint?: string }[] = [
    { icon: Wallet, label: 'Falta', value: money(detail.remaining) },
    { icon: TrendingUp, label: 'Ritmo de ahorro', value: `${money(detail.monthlyAverage)}/mes` },
    {
      icon: CalendarCheck,
      label: 'Fecha estimada',
      value: detail.reached
        ? '¡Lograda!'
        : detail.projectedDate
          ? formatDate(detail.projectedDate, 'MMM yyyy', settings.locale)
          : '—',
      ...(detail.monthsToComplete !== null && !detail.reached
        ? { hint: `en ${detail.monthsToComplete} mes(es)` }
        : {}),
    },
    detail.requiredMonthly !== null
      ? {
          icon: Flag,
          label: 'Necesario/mes',
          value: `${money(detail.requiredMonthly)}`,
          hint: detail.onTrack ? 'Vas al día' : 'Vas atrasado',
        }
      : { icon: Flag, label: 'Fecha límite', value: 'Sin fecha' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <Card key={row.label}>
            <CardContent className="space-y-1 p-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {row.label}
              </span>
              <p className="truncate text-lg font-semibold tabular-nums">{row.value}</p>
              {row.hint ? <p className="text-xs text-muted-foreground">{row.hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
