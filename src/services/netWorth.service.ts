import { db } from '@/db/db';
import { newId } from '@/lib/id';
import { nowIso, todayIso } from '@/lib/date';
import { asCents, type Cents } from '@/types/money';
import type { NetWorthSnapshotRow } from '@/db/schema';
import type { NetWorthSnapshotId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

/**
 * Snapshots de patrimonio para la serie histórica (evolución del patrimonio).
 * El patrimonio "en vivo" se calcula al vuelo; aquí solo se persisten puntos en
 * el tiempo (ADR-0007).
 */

export function snapshotsQuery(): Promise<NetWorthSnapshotRow[]> {
  return db.netWorthSnapshots.orderBy('date').toArray();
}

/**
 * Registra un snapshot del patrimonio. Si ya existe uno para la fecha, lo
 * reemplaza (un punto por día).
 */
export async function recordSnapshot(params: {
  assets: Cents;
  liabilities: Cents;
  date?: IsoDate;
}): Promise<NetWorthSnapshotRow> {
  const date = params.date ?? todayIso();
  const netWorth = asCents(params.assets - params.liabilities);

  return db.transaction('rw', db.netWorthSnapshots, async () => {
    const existing = await db.netWorthSnapshots.where('date').equals(date).first();
    const row: NetWorthSnapshotRow = {
      id: existing?.id ?? newId<NetWorthSnapshotId>(),
      date,
      assets: params.assets,
      liabilities: params.liabilities,
      netWorth,
      createdAt: existing?.createdAt ?? nowIso(),
    };
    await db.netWorthSnapshots.put(row);
    return row;
  });
}

export async function deleteSnapshot(id: NetWorthSnapshotId): Promise<void> {
  await db.netWorthSnapshots.delete(id);
}
