import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso } from '@/lib/date';
import { parseOrThrow } from '@/lib/validation/parse';
import {
  reminderCreateSchema,
  reminderUpdateSchema,
  type ReminderCreateInput,
  type ReminderUpdateInput,
} from '@/lib/validation/reminders.schema';
import { NotFoundError } from '@/lib/errors';
import type { ReminderRow } from '@/db/schema';
import type { ReminderId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

/** CRUD de recordatorios. */

export function remindersQuery(): Promise<ReminderRow[]> {
  return db.reminders.orderBy('dueDate').toArray();
}

export function pendingRemindersQuery(): Promise<ReminderRow[]> {
  return db.reminders.filter((r) => !r.isDone).sortBy('dueDate');
}

export async function getReminder(id: ReminderId): Promise<ReminderRow> {
  const row = await db.reminders.get(id);
  if (!row) throw new NotFoundError('Recordatorio', id);
  return row;
}

export async function createReminder(input: ReminderCreateInput): Promise<ReminderRow> {
  const data = parseOrThrow(reminderCreateSchema, input);
  const timestamp = nowIso();

  const row: ReminderRow = {
    id: newId<ReminderId>(),
    title: data.title,
    dueDate: data.dueDate as IsoDate,
    relatedType: data.relatedType,
    isDone: false,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(data.relatedId !== undefined && { relatedId: data.relatedId }),
  };

  await db.reminders.add(row);
  return row;
}

export async function updateReminder(id: ReminderId, input: ReminderUpdateInput): Promise<void> {
  const data = parseOrThrow(reminderUpdateSchema, input);
  await getReminder(id);

  const patch: Partial<ReminderRow> = {
    updatedAt: nowIso(),
    ...(data.title !== undefined && { title: data.title }),
    ...(data.dueDate !== undefined && { dueDate: data.dueDate as IsoDate }),
    ...(data.relatedType !== undefined && { relatedType: data.relatedType }),
    ...(data.relatedId !== undefined && { relatedId: data.relatedId }),
    ...(data.isDone !== undefined && { isDone: data.isDone }),
  };
  await db.reminders.update(id, patch);
}

export async function toggleReminderDone(id: ReminderId): Promise<void> {
  const reminder = await getReminder(id);
  await db.reminders.update(id, { isDone: !reminder.isDone, updatedAt: nowIso() });
}

export async function deleteReminder(id: ReminderId): Promise<void> {
  await db.reminders.delete(id);
}
