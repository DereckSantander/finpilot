import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGoal,
  updateGoal,
  archiveGoal,
  deleteGoal,
  emergencyFundGoalQuery,
} from '@/services/goals.service';
import { db } from '@/db/db';
import { resetDb, addGoal } from '@/test/seed';
import type { GoalId } from '@/types/ids';

const linkGoal = (goalId: GoalId) =>
  db.settings.update('app', { emergencyFund: { targetMonths: [3, 6, 12], linkedGoalId: goalId } });

const linkedGoalId = async () => (await db.settings.get('app'))?.emergencyFund.linkedGoalId;

describe('metas y fondo de emergencia', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('marcar una segunda meta como fondo desmarca la primera', async () => {
    const first = await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    const second = await addGoal('Nuevo fondo', 800_000);

    await updateGoal(second, { isEmergencyFund: true });

    expect((await db.goals.get(first))?.isEmergencyFund).toBe(false);
    expect((await db.goals.get(second))?.isEmergencyFund).toBe(true);
  });

  it('crear una meta como fondo desmarca la anterior', async () => {
    const first = await addGoal('Colchón', 500_000, { isEmergencyFund: true });

    const created = await createGoal({
      name: 'Fondo nuevo',
      targetAmount: 900_000,
      priority: 'high',
      color: '#0d9488',
      icon: 'Shield',
      isEmergencyFund: true,
    });

    expect((await db.goals.get(first))?.isEmergencyFund).toBe(false);
    expect((await db.goals.get(created.id))?.isEmergencyFund).toBe(true);
  });

  it('emergencyFundGoalQuery es determinista tras el cambio', async () => {
    await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    const second = await addGoal('Nuevo fondo', 800_000);

    await updateGoal(second, { isEmergencyFund: true });

    // Con dos metas marcadas, `.first()` devolvía una arbitraria.
    expect((await emergencyFundGoalQuery())?.id).toBe(second);
    const marked = (await db.goals.toArray()).filter((g) => g.isEmergencyFund);
    expect(marked).toHaveLength(1);
  });

  it('archivar la meta vinculada limpia linkedGoalId', async () => {
    const goal = await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    await linkGoal(goal);
    expect(await linkedGoalId()).toBe(goal);

    await archiveGoal(goal);

    expect(await linkedGoalId()).toBeUndefined();
  });

  it('updateGoal({isArchived:true}) desvincula igual que archiveGoal', async () => {
    const goal = await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    await linkGoal(goal);

    await updateGoal(goal, { isArchived: true });

    expect(await linkedGoalId()).toBeUndefined();
  });

  it('archivar otra meta no toca el vínculo', async () => {
    const linked = await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    const other = await addGoal('Viaje', 200_000);
    await linkGoal(linked);

    await archiveGoal(other);

    expect(await linkedGoalId()).toBe(linked);
  });

  it('eliminar la meta vinculada borra sus aportes y el vínculo', async () => {
    const goal = await addGoal('Colchón', 500_000, { isEmergencyFund: true });
    await linkGoal(goal);

    await deleteGoal(goal);

    expect(await linkedGoalId()).toBeUndefined();
    expect(await db.goalContributions.where('goalId').equals(goal).count()).toBe(0);
    expect(await db.goals.get(goal)).toBeUndefined();
  });
});
