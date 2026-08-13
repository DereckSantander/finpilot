import type { LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  /** Nombres disponibles (p. ej. `GOAL_ICON_NAMES`, `CATEGORY_ICON_NAMES`). */
  names: readonly string[];
  /** Resuelve el componente de icono a partir del nombre. */
  resolve: (name: string) => LucideIcon;
  label?: string;
}

/**
 * Rejilla de iconos seleccionables. El catálogo se inyecta (metas y categorías
 * tienen listas distintas), pero el marcado y el estado visual son comunes:
 * estaban duplicados palabra por palabra entre los dos diálogos.
 */
export function IconPicker({ value, onChange, names, resolve, label = 'Icono' }: IconPickerProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {names.map((name) => {
          const Icon = resolve(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                value === name
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent',
              )}
              aria-label={name}
              aria-pressed={value === name}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
