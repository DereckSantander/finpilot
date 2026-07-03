import { cn } from '@/lib/cn';

interface ProgressBarProps {
  /** Progreso 0–1. */
  value: number;
  /** Color de la barra (CSS). Por defecto, el primario. */
  color?: string;
  className?: string;
  trackClassName?: string;
}

/** Barra de progreso ligera (sin dependencias). Recorta el valor a [0, 1]. */
export function ProgressBar({ value, color, className, trackClassName }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', trackClassName)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all', !color && 'bg-primary', className)}
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
