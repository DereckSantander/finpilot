import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

/**
 * Registro del service worker (estrategia PWA, ADR-0008). `registerType` es
 * 'prompt': cuando hay una versión nueva se avisa al usuario y solo se actualiza
 * si acepta, para no interrumpir su trabajo. También se notifica cuando la app
 * queda lista para funcionar sin conexión.
 */
export function registerServiceWorker(): void {
  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Nueva versión disponible', {
        description: 'Actualiza para obtener las últimas mejoras.',
        duration: Infinity,
        action: {
          label: 'Actualizar',
          onClick: () => {
            void updateSW(true);
          },
        },
      });
    },
    onOfflineReady() {
      toast.success('FinPilot está listo para usarse sin conexión.');
    },
  });
}
