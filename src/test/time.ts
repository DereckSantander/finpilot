import { vi } from 'vitest';

/**
 * Control del reloj en las pruebas.
 *
 * Se congela **solo `Date`** (`toFake: ['Date']`): fake-indexeddb programa sus
 * transacciones con timers reales, así que falsear todos los temporizadores
 * dejaría a Dexie colgado esperando un tick que nunca llega.
 */

/** Congela `Date` en el instante indicado (ISO completo). */
export function freezeTime(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

/** Restaura el reloj real. Llamar en `afterEach`. */
export function unfreezeTime(): void {
  vi.useRealTimers();
}
