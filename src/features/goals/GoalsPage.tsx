import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, PiggyBank, Flag } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { GoalFormDialog } from '@/features/goals/components/GoalFormDialog';
import { ContributionDialog } from '@/features/goals/components/ContributionDialog';
import { useGoals } from '@/features/goals/hooks/useGoalsData';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney } from '@/lib/format';
import { goalDetailPath } from '@/constants/routes';
import { sumCents } from '@/lib/money';
import type { GoalId } from '@/types/ids';

/** Metas (F05): objetivos de ahorro con progreso, asignación y detalle. */
export function GoalsPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const goals = useGoals();

  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<GoalId | undefined>(undefined);

  const totals = useMemo(() => {
    const list = goals ?? [];
    const saved = sumCents(list.map((g) => g.saved));
    const target = sumCents(list.map((g) => g.goal.targetAmount));
    return { saved, target, count: list.length };
  }, [goals]);

  const money = (v: (typeof totals)['saved']) =>
    formatMoney(v, { currency: settings.currency, locale: settings.locale });

  const loading = goals === undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        description="Define objetivos de ahorro y sigue tu progreso."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva meta</span>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas todavía"
          description="Crea metas ilimitadas (carro, viaje, fondo de emergencia…) y sigue su progreso."
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear meta
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard icon={PiggyBank} label="Total ahorrado" value={money(totals.saved)} />
            <SummaryCard icon={Flag} label="Objetivo total" value={money(totals.target)} />
            <SummaryCard icon={Target} label="Metas activas" value={String(totals.count)} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {goals.map((progress) => (
              <GoalCard
                key={progress.goal.id}
                progress={progress}
                settings={settings}
                onOpen={() => navigate(goalDetailPath(progress.goal.id))}
                onAssign={() => setAssigning(progress.goal.id)}
              />
            ))}
          </div>
        </>
      )}

      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {assigning ? (
        <ContributionDialog
          goalId={assigning}
          open={assigning !== undefined}
          onOpenChange={(open) => !open && setAssigning(undefined)}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
