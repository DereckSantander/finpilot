import { X } from 'lucide-react';
import { stripUndefined } from '@/lib/object';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CategoryRow, PaymentMethodRow, TagRow } from '@/db/schema';

const ALL = '__all__';

export interface TransactionFilterValue {
  categoryId?: string;
  paymentMethodId?: string;
  tag?: string;
}

interface TransactionFiltersProps {
  categories: CategoryRow[];
  paymentMethods: PaymentMethodRow[];
  tags: TagRow[];
  value: TransactionFilterValue;
  onChange: (value: TransactionFilterValue) => void;
}

/** Barra de filtros de movimientos (categoría, método de pago y etiqueta). */
export function TransactionFilters({
  categories,
  paymentMethods,
  tags,
  value,
  onChange,
}: TransactionFiltersProps) {
  const activeCount = [value.categoryId, value.paymentMethodId, value.tag].filter(Boolean).length;

  const set = (patch: Partial<Record<keyof TransactionFilterValue, string | undefined>>) =>
    onChange(stripUndefined({ ...value, ...patch }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.categoryId ?? ALL}
        onValueChange={(v) => set({ categoryId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[9rem] gap-2">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las categorías</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.paymentMethodId ?? ALL}
        onValueChange={(v) => set({ paymentMethodId: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[9rem]">
          <SelectValue placeholder="Método de pago" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los métodos</SelectItem>
          {paymentMethods.map((method) => (
            <SelectItem key={method.id} value={method.id}>
              {method.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {tags.length > 0 ? (
        <Select
          value={value.tag ?? ALL}
          onValueChange={(v) => set({ tag: v === ALL ? undefined : v })}
        >
          <SelectTrigger className="h-9 w-auto min-w-[8rem]">
            <SelectValue placeholder="Etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las etiquetas</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.name}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {activeCount > 0 ? (
        <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={() => onChange({})}>
          <X className="h-3.5 w-3.5" />
          Limpiar ({activeCount})
        </Button>
      ) : null}
    </div>
  );
}
