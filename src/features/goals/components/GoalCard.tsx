import { Plus, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/common/ProgressBar';
import { goalIcon } from '@/features/goals/lib/icons';
import { formatMoney, formatPercent } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { GoalProgress } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { Priority } from '@/types/common';

interface GoalCardProps {
  progress: GoalProgress;
  settings: SettingsRow;
  onOpen: () => void;
  onAssign: () => void;
}

const PRIORITY_LABEL: Record<Priority, string> = { high: 'Alta', medium: 'Media', low: 'Baja' };

/** Tarjeta de una meta con progreso y acción rápida de asignar dinero. */
export function GoalCard({ progress, settings, onOpen, onAssign }: GoalCardProps) {
  const { goal, saved, percent } = progress;
  const Icon = goalIcon(goal.icon);
  const reached = percent >= 1;

  const money = (value: GoalProgress['saved']) =>
    formatMoney(value, { currency: settings.currency, locale: settings.locale });

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${goal.color}22`, color: goal.color }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{goal.name}</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Prioridad {PRIORITY_LABEL[goal.priority]}</span>
                {goal.isEmergencyFund ? (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                    Fondo
                  </Badge>
                ) : null}
              </div>
            </div>
          </button>
          {reached ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Lograda
            </Badge>
          ) : null}
        </div>

        <ProgressBar value={percent} color={goal.color} />

        <div className="flex items-center justify-between text-sm tabular-nums">
          <span className="font-medium">{money(saved)}</span>
          <span className={cn('text-muted-foreground', reached && 'text-success')}>
            {formatPercent(percent, settings.locale)}
          </span>
          <span className="text-muted-foreground">{money(goal.targetAmount)}</span>
        </div>

        <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={onAssign}>
          <Plus className="h-4 w-4" />
          Asignar dinero
        </Button>
      </CardContent>
    </Card>
  );
}
