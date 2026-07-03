/**
 * Lee los design tokens (variables CSS HSL) en tiempo de ejecución para
 * usarlos en el canvas de Chart.js, que no entiende `hsl(var(--x))`. Se
 * recalcula al cambiar de tema (los consumidores dependen de `resolvedTheme`).
 */

/** Devuelve el valor crudo de una variable CSS ("174 72% 30%"). */
function readVar(token: string): string {
  if (typeof window === 'undefined') return '0 0% 0%';
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

/** Devuelve un color `hsl(...)` a partir de un token de tema, con alfa opcional. */
export function themeColor(token: string, alpha = 1): string {
  const value = readVar(token);
  if (!value) return `rgba(0,0,0,${alpha})`;
  return alpha === 1 ? `hsl(${value})` : `hsl(${value} / ${alpha})`;
}

/** Aplica alfa a un color HEX (#rrggbb) para rellenos translúcidos. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
