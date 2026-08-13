import { useMemo, type DependencyList } from 'react';
import { useTheme } from '@/hooks/useTheme';

/**
 * Memoiza la configuración de un gráfico incluyendo el tema en las dependencias.
 *
 * Los colores de Chart.js se obtienen con `themeColor()`, que lee variables CSS
 * en tiempo de ejecución: es una dependencia **invisible** para el linter, que
 * no puede saber que el resultado cambia al alternar claro/oscuro. Antes cada
 * componente lo resolvía con su propio `eslint-disable-next-line
 * react-hooks/exhaustive-deps` — quince en total, uno por cada `useMemo` de
 * datos y de opciones.
 *
 * Concentrando aquí esa dependencia, la supresión queda en un único sitio
 * justificado y los componentes declaran solo sus dependencias reales.
 */
export function useChartConfig<T>(build: () => T, deps: DependencyList): T {
  const { resolvedTheme } = useTheme();

  // `resolvedTheme` es la dependencia invisible: fuerza recalcular los colores
  // leídos de CSS. `build` se reconstruye en cada render por diseño, así que se
  // omite a propósito y se confía en `deps`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(build, [...deps, resolvedTheme]);
}
