import { useLiveQuery } from 'dexie-react-hooks';
import { backupsQuery } from '@/services/backups.service';
import type { BackupRow } from '@/db/schema';

/** Respaldos locales almacenados, del más reciente al más antiguo (reactivo). */
export function useBackups(): BackupRow[] | undefined {
  return useLiveQuery(() => backupsQuery(), []);
}
