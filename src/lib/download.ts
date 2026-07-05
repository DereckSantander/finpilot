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

/** Sufijo de fecha para nombres de archivo ("2026-07-05"). */
export function fileDateStamp(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
