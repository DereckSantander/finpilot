import { PieChart } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ProgressBar } from '@/components/common/ProgressBar';
import { DonutChart } from '@/components/charts/DonutChart';
import { formatMoney, formatPercent } from '@/lib/format';
import { asCents } from '@/types/money';
import type { SettingsRow } from '@/db/schema';

export interface BreakdownItem {
  id: string;
  name: string;
  value: number; // centavos
  percent: number; // 0–1
  color: string;
}

interface BreakdownPanelProps {
  items: BreakdownItem[];
  settings: SettingsRow;
  emptyLabel?: string;
}

/** Dona + lista de un desglose (categorías, métodos de pago…). Interactivo. */
export function BreakdownPanel({ items, settings, emptyLabel }: BreakdownPanelProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="Sin datos"
        description={emptyLabel ?? 'No hay movimientos en este periodo.'}
      />
    );
  }

  const total = items.reduce((acc, i) => acc + i.value, 0);
  const money = (v: number) =>
    formatMoney(asCents(v), { currency: settings.currency, locale: settings.locale });

  return (
    <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
      <div className="relative h-52 w-52 shrink-0">
        <DonutChart
          data={items.slice(0, 10).map((i) => ({ label: i.name, value: i.value, color: i.color }))}
          currency={settings.currency}
          locale={settings.locale}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
        </div>
      </div>

      <ul className="w-full flex-1 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">
                {money(item.value)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatPercent(item.percent, settings.locale)}
                </span>
              </span>
            </div>
            <ProgressBar value={item.percent} color={item.color} />
          </li>
        ))}
      </ul>
    </div>
  );
}
