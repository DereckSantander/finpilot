import { Info, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ExplainableCard } from '@/features/dashboard/components/ExplainableCard';
import { cn } from '@/lib/cn';
import type { KpiExplanation } from '@/features/dashboard/lib/kpiExplain';
import type { SettingsRow } from '@/db/schema';

type Intent = 'default' | 'positive' | 'negative' | 'primary';

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  intent?: Intent;
  /** Si se pasa, la tarjeta se vuelve pulsable y abre su desglose. */
  explanation?: KpiExplanation;
  settings?: SettingsRow;
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
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  intent = 'default',
  explanation,
  settings,
}: KpiCardProps) {
  const body = (
    <CardContent className="flex items-start justify-between gap-3 p-5">
      <div className="min-w-0 space-y-1">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {label}
          {explanation ? <Info className="h-3.5 w-3.5 opacity-70" aria-hidden /> : null}
        </p>
        <p className={cn('truncate text-2xl font-semibold tabular-nums', intentValueClass[intent])}>
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
  );

  if (explanation && settings) {
    return (
      <ExplainableCard title={label} explanation={explanation} settings={settings}>
        {body}
      </ExplainableCard>
    );
  }

  return <Card>{body}</Card>;
}
