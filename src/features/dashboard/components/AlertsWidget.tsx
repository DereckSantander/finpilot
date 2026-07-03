import {
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldAlert,
  BellRing,
  type LucideIcon,
} from 'lucide-react';
import { DashboardSection } from '@/features/dashboard/components/DashboardSection';
import { cn } from '@/lib/cn';
import type { DashboardAlert, AlertLevel } from '@/features/dashboard/lib/alerts';

interface AlertsWidgetProps {
  alerts: DashboardAlert[];
}

const LEVEL_META: Record<AlertLevel, { icon: LucideIcon; className: string }> = {
  danger: { icon: ShieldAlert, className: 'bg-destructive/10 text-destructive' },
  warning: { icon: AlertTriangle, className: 'bg-warning/15 text-warning' },
  info: { icon: Info, className: 'bg-primary/10 text-primary' },
  success: { icon: CheckCircle2, className: 'bg-success/10 text-success' },
};

/** Widget: alertas e indicadores accionables derivados de los datos reales. */
export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  return (
    <DashboardSection title="Alertas" icon={<BellRing className="h-4 w-4 text-muted-foreground" />}>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Todo en orden. No hay alertas por ahora.</span>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const meta = LEVEL_META[alert.level];
            const Icon = meta.icon;
            return (
              <li
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    meta.className,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="leading-snug">{alert.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
