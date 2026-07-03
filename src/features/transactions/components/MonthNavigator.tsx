import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import type { YearMonth } from '@/types/common';

interface MonthNavigatorProps {
  value: YearMonth;
  onChange: (value: YearMonth) => void;
}

function shift(yearMonth: YearMonth, months: number): YearMonth {
  const date = addMonths(parseISO(`${yearMonth}-01`), months);
  return format(date, 'yyyy-MM') as YearMonth;
}

/** Selector de mes con navegación anterior/siguiente. */
export function MonthNavigator({ value, onChange }: MonthNavigatorProps) {
  const label = format(parseISO(`${value}-01`), 'MMMM yyyy', { locale: es });

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onChange(shift(value, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="min-w-[9rem] text-center text-sm font-medium capitalize">{label}</div>
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9"
        onClick={() => onChange(shift(value, 1))}
        aria-label="Mes siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
