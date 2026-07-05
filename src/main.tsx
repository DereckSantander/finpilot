import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { openDatabase } from '@/db/db';
import { maybeRunAutoBackup } from '@/services/autoBackup.service';
import { registerServiceWorker } from '@/pwa';
import '@/styles/globals.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('No se encontró el elemento #root en el HTML.');
}

const root = createRoot(container);

/**
 * Arranque: abre (y siembra en su primera vez) la base de datos antes de
 * renderizar, para detectar fallos de IndexedDB de forma temprana. Luego monta
 * la app y registra el service worker de la PWA.
 */
async function bootstrap(): Promise<void> {
  try {
    await openDatabase();
  } catch (error) {
    console.error('[FinPilot] No se pudo abrir la base de datos local:', error);
    root.render(
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold">No se pudo iniciar FinPilot</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          El navegador bloqueó el acceso al almacenamiento local (IndexedDB). Desactiva el modo
          incógnito o habilita el almacenamiento del sitio e inténtalo de nuevo.
        </p>
      </div>,
    );
    return;
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  registerServiceWorker();

  // Respaldo automático en segundo plano (no bloquea el arranque).
  void maybeRunAutoBackup();
}

void bootstrap();
