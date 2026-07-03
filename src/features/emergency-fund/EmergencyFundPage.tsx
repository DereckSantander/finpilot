import { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Plus,
  Pencil,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressBar } from '@/components/common/ProgressBar';
import { EmptyState } from '@/components/common/EmptyState';
import { EmergencyFundSetupDialog } from '@/features/emergency-fund/components/EmergencyFundSetupDialog';
import { ContributionDialog } from '@/features/goals/components/ContributionDialog';
import { ContributionsList } from '@/features/goals/components/ContributionsList';
import { GoalContributionsChart } from '@/features/goals/components/GoalContributionsChart';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog';
import { useEmergencyFund } from '@/features/emergency-fund/hooks/useEmergencyFund';
import { useGoalContributions, useGoalMonthly } from '@/features/goals/hooks/useGoalsData';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { EmergencyFundStatus, EmergencyFundMilestone } from '@/services/metrics.service';
import type { GoalRow, SettingsRow } from '@/db/schema';
import type { GoalId } from '@/types/ids';

/** Fondo de emergencia (F06): cobertura en meses y objetivos 3/6/12. */
export function EmergencyFundPage() {
  const settings = useSettings();
  const status = useEmergencyFund(3);
  const [setupOpen, setSetupOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fondo de emergencia"
        description="Cuántos meses de gastos cubres y cuánto falta para 3, 6 y 12 meses."
      />

      {status === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : status.goal ? (
        <FundOverview status={status} goal={status.goal} settings={settings} />
      ) : (
        <FundSetup
          status={status}
          settings={settings}
          onCreate={() => setSetupOpen(true)}
          setupOpen={setupOpen}
          onSetupOpenChange={setSetupOpen}
        />
      )}
    </div>
  );
}

// --- Sin fondo: configuración inicial -------------------------------------

function FundSetup({
  status,
  settings,
  onCreate,
  setupOpen,
  onSetupOpenChange,
}: {
  status: EmergencyFundStatus;
  settings: SettingsRow;
  onCreate: () => void;
  setupOpen: boolean;
  onSetupOpenChange: (open: boolean) => void;
}) {
  const money = (v: EmergencyFundStatus['saved']) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  return (
    <>
      <EmptyState
        icon={ShieldCheck}
        title="Aún no tienes un fondo de emergencia"
        description="Es tu colchón para imprevistos (perder el empleo, una urgencia médica…). Créalo y ve cuántos meses de gastos cubre."
        action={
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Crear fondo
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Objetivos estimados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Según tu gasto medio de{' '}
            <span className="font-medium text-foreground">
              {money(status.averageMonthlyExpense)}/mes
            </span>
            , necesitarías:
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {status.milestones.map((m) => (
              <div key={m.months} className="rounded-lg border border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">{m.months} meses</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{money(m.target)}</p>
              </div>
            ))}
          </div>
          {status.averageMonthlyExpense === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Registra algunos gastos para estimar mejor tu objetivo.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <EmergencyFundSetupDialog
        open={setupOpen}
        onOpenChange={onSetupOpenChange}
        recommended={status.recommended}
      />
    </>
  );
}

// --- Con fondo: visión general --------------------------------------------

function FundOverview({
  status,
  goal,
  settings,
}: {
  status: EmergencyFundStatus;
  goal: GoalRow;
  settings: SettingsRow;
}) {
  const goalId = goal.id as GoalId;
  const contributions = useGoalContributions(goalId);
  const monthly = useGoalMonthly(goalId, 6);

  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const money = (v: EmergencyFundStatus['saved']) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const recommendedMonths = status.targetMonths.includes(6)
    ? 6
    : (status.targetMonths[status.targetMonths.length - 1] ?? 6);
  const coverageRatio = recommendedMonths > 0 ? status.monthsCovered / recommendedMonths : 0;
  const fullyCovered = status.milestones.every((m) => m.reached) && status.milestones.length > 0;
  const hasContribData = (monthly ?? []).some((m) => m.amount !== 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Editar objetivo</span>
        </Button>
        <Button className="gap-2" onClick={() => setAssignOpen(true)}>
          <Plus className="h-4 w-4" />
          Asignar dinero
        </Button>
      </div>

      {/* Cobertura */}
      <Card>
        <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_1.4fr] md:items-center">
          <div className="text-center md:text-left">
            <p className="text-sm text-muted-foreground">Cobertura actual</p>
            <p className="mt-1 text-5xl font-bold tabular-nums text-primary">
              {status.monthsCovered.toFixed(1)}
              <span className="ml-2 text-2xl font-medium text-muted-foreground">meses</span>
            </p>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground md:justify-start">
              {fullyCovered ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" /> Fondo completo
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-warning" /> Meta: {recommendedMonths} meses
                </>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <MiniStat icon={PiggyBank} label="Ahorrado" value={money(status.saved)} />
              <MiniStat
                icon={TrendingDown}
                label="Gasto medio"
                value={`${money(status.averageMonthlyExpense)}/mes`}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso hacia {recommendedMonths} meses</span>
                <span>{formatPercent(Math.min(coverageRatio, 1), settings.locale)}</span>
              </div>
              <ProgressBar value={coverageRatio} color={goal.color} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hitos 3/6/12 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {status.milestones.map((m) => (
          <MilestoneCard key={m.months} milestone={m} settings={settings} />
        ))}
      </div>

      {/* Aportes + historial */}
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
                icon={PiggyBank}
                title="Sin aportes recientes"
                description="Asigna dinero para hacer crecer tu fondo."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <ContributionsList contributions={contributions ?? []} settings={settings} />
          </CardContent>
        </Card>
      </div>

      <ContributionDialog goalId={goalId} open={assignOpen} onOpenChange={setAssignOpen} />
      <GoalFormDialog open={editOpen} onOpenChange={setEditOpen} initial={goal} />
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof PiggyBank;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <p className="mt-1 truncate text-base font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MilestoneCard({
  milestone,
  settings,
}: {
  milestone: EmergencyFundMilestone;
  settings: SettingsRow;
}) {
  const money = (v: EmergencyFundMilestone['target']) =>
    formatMoney(v, {
      currency: settings.currency,
      locale: settings.locale,
      hideZeroDecimals: true,
    });

  return (
    <Card className={cn(milestone.reached && 'border-success/40 bg-success/5')}>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{milestone.months} meses</p>
          {milestone.reached ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Cubierto
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              {formatPercent(milestone.percent, settings.locale)}
            </span>
          )}
        </div>
        <ProgressBar
          value={milestone.percent}
          {...(milestone.reached ? { color: 'hsl(var(--success))' } : {})}
        />
        <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
          <span>Objetivo {money(milestone.target)}</span>
          {milestone.reached ? (
            <span className="text-success">¡Listo!</span>
          ) : (
            <span>Faltan {money(milestone.remaining)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
