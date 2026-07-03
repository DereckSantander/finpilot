import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';

type Intent = 'default' | 'positive' | 'negative' | 'primary';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  intent?: Intent;
}

const intentValueClass: Record<Intent, string> = {
  default: 'text-foreground',
  positive: 'text-success',
  negative: 'text-destructive',
  primary: 'text-primary',
};

const intentIconClass: Record<Intent, string> = {
  default: 'bg-muted text-muted-foreground',
  positive: 'bg-success/10 text-success',
  negative: 'bg-destructive/10 text-destructive',
  primary: 'bg-primary/10 text-primary',
};

/** Tarjeta de indicador clave (KPI) del dashboard. */
export function KpiCard({ label, value, icon: Icon, hint, intent = 'default' }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn('truncate text-2xl font-semibold tabular-nums', intentValueClass[intent])}
          >
            {value}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            intentIconClass[intent],
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
