import { format } from 'date-fns';

/** Dispara la descarga de un Blob como archivo (solo capa de UI/navegador). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Libera el objeto URL en el siguiente tick (tras iniciar la descarga).
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Sufijo de fecha para nombres de archivo ("2026-07-05"). Usa la fecha **local**,
 * no `toISOString()` (UTC): en husos negativos, a última hora de la tarde el
 * sello saltaba al día siguiente y no coincidía con el `todayIso()` que usa el
 * resto de la app.
 */
export function fileDateStamp(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}
