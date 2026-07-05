import { db } from '@/db/db';
import { createLocalBackup } from '@/services/backups.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Crea un respaldo local si el respaldo automático está activo y ya venció el
 * intervalo configurado. Pensado para llamarse en el arranque; no bloquea ni
 * propaga errores (un fallo de respaldo no debe impedir usar la app).
 */
export async function maybeRunAutoBackup(): Promise<void> {
  try {
    const settings = await db.settings.get('app');
    if (!settings?.autoBackup.enabled) return;

    const latest = await db.backups.orderBy('createdAt').last();
    if (latest) {
      const ageDays = (Date.now() - new Date(latest.createdAt).getTime()) / MS_PER_DAY;
      if (ageDays < settings.autoBackup.frequencyDays) return;
    }

    await createLocalBackup(settings.autoBackup.keep);
  } catch (error) {
    console.error('[FinPilot] Respaldo automático omitido:', error);
  }
}
