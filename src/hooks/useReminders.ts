import { useLiveQuery } from 'dexie-react-hooks';
import { pendingRemindersQuery } from '@/services/reminders.service';
import type { ReminderRow } from '@/db/schema';

/** Recordatorios pendientes (reactivo), ordenados por fecha de vencimiento. */
export function usePendingReminders(): ReminderRow[] {
  return useLiveQuery(pendingRemindersQuery, [], [] as ReminderRow[]) ?? [];
}
