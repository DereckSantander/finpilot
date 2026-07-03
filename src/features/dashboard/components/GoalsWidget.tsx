import { Target } from 'lucide-react';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { formatMoney, formatPercent } from '@/lib/format';
import { ROUTES } from '@/constants/routes';
import type { GoalProgress } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';

interface GoalsWidgetProps {
  goals: GoalProgress[];
  settings: SettingsRow;
}

/** Widget: progreso de las metas de ahorro. */
export function GoalsWidget({ goals, settings }: GoalsWidgetProps) {
  const top = goals.slice(0, 4);

  return (
    <DashboardSection
      title="Metas"
      icon={<Target className="h-4 w-4 text-muted-foreground" />}
      to={ROUTES.goals}
    >
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Sin metas todavía"
          description="Crea metas de ahorro para seguir tu progreso."
          action={
            <Button asChild size="sm">
              <Link to={ROUTES.goals}>Crear meta</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {top.map(({ goal, saved, percent }) => (
            <li key={goal.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{goal.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPercent(percent, settings.locale)}
                </span>
              </div>
              <ProgressBar value={percent} color={goal.color} />
              <div className="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                <span>
                  {formatMoney(saved, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span>
                  {formatMoney(goal.targetAmount, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
