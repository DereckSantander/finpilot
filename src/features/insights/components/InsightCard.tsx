import {
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { Insight, InsightSeverity, InsightCategory } from '@/lib/insights/types';

const SEVERITY_META: Record<
  InsightSeverity,
  { icon: LucideIcon; iconClass: string; ring: string }
> = {
  critical: {
    icon: ShieldAlert,
    iconClass: 'bg-destructive/10 text-destructive',
    ring: 'border-destructive/30',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'bg-warning/15 text-warning',
    ring: 'border-warning/30',
  },
  suggestion: {
    icon: Lightbulb,
    iconClass: 'bg-primary/10 text-primary',
    ring: 'border-primary/20',
  },
  positive: {
    icon: CheckCircle2,
    iconClass: 'bg-success/10 text-success',
    ring: 'border-success/30',
  },
  info: { icon: Info, iconClass: 'bg-muted text-muted-foreground', ring: 'border-border' },
};

const CATEGORY_LABEL: Record<InsightCategory, string> = {
  spending: 'Gasto',
  saving: 'Ahorro',
  goals: 'Metas',
  emergency: 'Fondo de emergencia',
  cards: 'Tarjetas',
};

/** Tarjeta individual de insight con icono/color según severidad. */
export function InsightCard({ insight }: { insight: Insight }) {
  const meta = SEVERITY_META[insight.severity];
  const Icon = meta.icon;

  return (
    <Card className={cn('border', meta.ring)}>
      <CardContent className="flex gap-3 p-4">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            meta.iconClass,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug">{insight.title}</h3>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {CATEGORY_LABEL[insight.category]}
            </span>
          </div>
          <p className="text-sm leading-snug text-muted-foreground">{insight.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
