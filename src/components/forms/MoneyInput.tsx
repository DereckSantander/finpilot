import { forwardRef, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { parseCents, fromCents } from '@/lib/money';
import type { Cents } from '@/types/money';

interface MoneyInputProps {
  value: Cents;
  onChange: (value: Cents) => void;
  onBlur?: () => void;
  id?: string;
  name?: string;
  placeholder?: string;
  currencySymbol?: string;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  'aria-invalid'?: boolean;
}

/** Convierte centavos a un texto editable ("12.34"); 0 → vacío. */
function centsToText(value: Cents): string {
  return value === 0 ? '' : String(fromCents(value));
}

/**
 * Entrada monetaria: el usuario escribe importes normales y el componente
 * mantiene el valor en centavos (`Cents`). No formatea en vivo para no pelear
 * con el cursor; usa `inputMode="decimal"` para el teclado numérico en móvil.
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, onBlur, currencySymbol = '$', className, ...props },
  ref,
) {
  const [text, setText] = useState<string>(() => centsToText(value));
  const focused = useRef(false);

  // Sincroniza el texto cuando el valor externo cambia (p. ej. al editar) y el
  // campo no está enfocado, para no interrumpir la escritura.
  useEffect(() => {
    if (!focused.current) {
      setText(centsToText(value));
    }
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {currencySymbol}
      </span>
      <Input
        ref={ref}
        inputMode="decimal"
        className={cn('pl-7 tabular-nums', className)}
        value={text}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setText(raw);
          onChange(parseCents(raw));
        }}
        onBlur={() => {
          focused.current = false;
          setText(centsToText(value));
          onBlur?.();
        }}
        {...props}
      />
    </div>
  );
});
