import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { ENTITY_COLORS } from '@/constants/palette';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  /** Colores a ofrecer. Por defecto, la paleta compartida. */
  colors?: readonly string[];
}

/**
 * Selector de color de una entidad (meta, tarjeta, categoría). Estaba duplicado
 * en los tres diálogos, cada uno con su propio arreglo de colores.
 */
export function ColorPicker({ value, onChange, label = 'Color', colors }: ColorPickerProps) {
  const options = colors ?? ENTITY_COLORS;

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition',
              value === color && 'ring-2 ring-ring',
            )}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
            aria-pressed={value === color}
          />
        ))}
      </div>
    </div>
  );
}
