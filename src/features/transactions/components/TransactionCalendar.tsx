import { useMemo } from 'react';
import { startOfWeek, addDays, isSameMonth, isToday, parseISO, format } from 'date-fns';
import { formatCompactMoney } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { TransactionRow } from '@/db/schema';
import type { IsoDate, TransactionType, YearMonth } from '@/types/common';
import type { SettingsRow } from '@/db/schema';

interface TransactionCalendarProps {
  transactions: TransactionRow[];
  yearMonth: YearMonth;
  type: TransactionType;
  settings: SettingsRow;
  selectedDate: IsoDate | null;
  onSelectDate: (date: IsoDate) => void;
}

interface DayCell {
  date: IsoDate;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  total: number;
  count: number;
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Vista de calendario mensual con el total diario de movimientos del tipo dado. */
export function TransactionCalendar({
  transactions,
  yearMonth,
  type,
  settings,
  selectedDate,
  onSelectDate,
}: TransactionCalendarProps) {
  const cells = useMemo<DayCell[]>(() => {
    const monthStart = parseISO(`${yearMonth}-01`);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });

    const totals = new Map<string, { total: number; count: number }>();
    for (const tx of transactions) {
      const entry = totals.get(tx.date) ?? { total: 0, count: 0 };
      entry.total += tx.amount;
      entry.count += 1;
      totals.set(tx.date, entry);
    }

    return Array.from({ length: 42 }, (_, index) => {
      const day = addDays(gridStart, index);
      const iso = format(day, 'yyyy-MM-dd') as IsoDate;
      const entry = totals.get(iso);
      return {
        date: iso,
        dayNumber: day.getDate(),
        inMonth: isSameMonth(day, monthStart),
        isToday: isToday(day),
        total: entry?.total ?? 0,
        count: entry?.count ?? 0,
      };
    });
  }, [transactions, yearMonth]);

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={i}
            className="py-1 text-center text-xs font-medium uppercase text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isSelected = selectedDate === cell.date;
          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              className={cn(
                'flex min-h-[64px] flex-col rounded-lg border p-1.5 text-left transition-colors',
                cell.inMonth
                  ? 'border-border/60 hover:border-primary/50 hover:bg-accent/40'
                  : 'border-transparent text-muted-foreground/50',
                isSelected && 'border-primary bg-primary/10 hover:bg-primary/10',
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
              {cell.count > 0 ? (
                <span
                  className={cn(
                    'mt-auto truncate text-[11px] font-medium tabular-nums',
                    type === 'income' ? 'text-success' : 'text-foreground',
                  )}
                >
                  {formatCompactMoney(
                    cell.total as TransactionRow['amount'],
                    settings.currency,
                    settings.locale,
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
