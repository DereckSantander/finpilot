import { useMemo, useState } from 'react';
import {
  startOfWeek,
  addDays,
  isSameMonth,
  isToday,
  parseISO,
  format,
  getDaysInMonth,
} from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthNavigator } from '@/features/transactions/components/MonthNavigator';
import { cn } from '@/lib/cn';
import { currentYearMonth } from '@/lib/date';
import type { CardSummary } from '@/services/metrics.service';
import type { YearMonth } from '@/types/common';

interface PaymentsCalendarProps {
  cards: CardSummary[];
}

interface DayEvent {
  cardId: string;
  cardName: string;
  color: string;
  kind: 'corte' | 'pago';
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Calendario mensual con los cortes y fechas de pago de todas las tarjetas. */
export function PaymentsCalendar({ cards }: PaymentsCalendarProps) {
  const [yearMonth, setYearMonth] = useState<YearMonth>(() => currentYearMonth());

  const eventsByDay = useMemo(() => {
    const map = new Map<number, DayEvent[]>();
    // Un corte el 31 cae el 28/29 en febrero, pero el 31 en julio: se ancla al
    // último día real del mes mostrado en lugar de recortar todo al 28.
    const lastDay = getDaysInMonth(parseISO(`${yearMonth}-01`));
    for (const { card } of cards) {
      const push = (day: number, kind: DayEvent['kind']) => {
        const clamped = Math.min(day, lastDay);
        const list = map.get(clamped) ?? [];
        list.push({ cardId: card.id, cardName: card.name, color: card.color, kind });
        map.set(clamped, list);
      };
      push(card.cutoffDay, 'corte');
      push(card.paymentDueDay, 'pago');
    }
    return map;
  }, [cards, yearMonth]);

  const cells = useMemo(() => {
    const monthStart = parseISO(`${yearMonth}-01`);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, index) => {
      const day = addDays(gridStart, index);
      return {
        key: format(day, 'yyyy-MM-dd'),
        dayNumber: day.getDate(),
        inMonth: isSameMonth(day, monthStart),
        isToday: isToday(day),
        events: isSameMonth(day, monthStart) ? (eventsByDay.get(day.getDate()) ?? []) : [],
      };
    });
  }, [yearMonth, eventsByDay]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Calendario de pagos
        </CardTitle>
        <MonthNavigator value={yearMonth} onChange={setYearMonth} />
      </CardHeader>
      <CardContent>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => (
            <div
              key={i}
              className="py-1 text-center text-xs font-medium uppercase text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={cn(
                'min-h-[68px] rounded-lg border p-1.5',
                cell.inMonth ? 'border-border/60' : 'border-transparent text-muted-foreground/40',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  cell.isToday && 'bg-primary font-semibold text-primary-foreground',
                )}
              >
                {cell.dayNumber}
              </span>
              <div className="mt-1 space-y-0.5">
                {cell.events.map((event, i) => (
                  <div
                    key={`${event.cardId}-${event.kind}-${i}`}
                    className="flex items-center gap-1 truncate rounded px-1 text-[10px] leading-tight"
                    style={{
                      backgroundColor: `${event.color}22`,
                      color: event.color,
                    }}
                    title={`${event.kind === 'pago' ? 'Pago' : 'Corte'} · ${event.cardName}`}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="truncate">{event.kind === 'pago' ? 'Pago' : 'Corte'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span>Corte = fecha de cierre · Pago = fecha máxima de pago</span>
        </div>
      </CardContent>
    </Card>
  );
}
