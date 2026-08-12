import { describe, it, expect, beforeEach } from 'vitest';
import {
  createContribution,
  updateContribution,
  deleteContribution,
} from '@/services/goalContributions.service';
import { savedAmount } from '@/services/goals.service';
import { db } from '@/db/db';
import { resetDb, addGoal, addContribution } from '@/test/seed';
import { ConflictError, NotFoundError } from '@/lib/errors';
import type { GoalContributionId } from '@/types/ids';

describe('aportes a metas', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('un retiro dentro del saldo se registra', async () => {
    const goal = await addGoal('Viaje', 500_000);
    await addContribution(goal, 100_000, '2026-07-01');

    await createContribution({ goalId: goal, amount: -40_000, date: '2026-07-10' });

    expect(await savedAmount(goal)).toBe(60_000);
  });

  it('un retiro mayor que el ahorro se rechaza', async () => {
    const goal = await addGoal('Viaje', 500_000);
    await addContribution(goal, 100_000, '2026-07-01');

    await expect(
      createContribution({ goalId: goal, amount: -150_000, date: '2026-07-10' }),
    ).rejects.toBeInstanceOf(ConflictError);

    // La transacción se revierte: el saldo no se mueve.
    expect(await savedAmount(goal)).toBe(100_000);
  });

  it('no se puede aportar a una meta archivada', async () => {
    const goal = await addGoal('Viaje', 500_000);
    await db.goals.update(goal, { isArchived: true });

    await expect(
      createContribution({ goalId: goal, amount: 10_000, date: '2026-07-10' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('editar un aporte no puede dejar la meta en negativo', async () => {
    const goal = await addGoal('Viaje', 500_000);
    await addContribution(goal, 100_000, '2026-07-01');
    const extra = await createContribution({
      goalId: goal,
      amount: 20_000,
      date: '2026-07-05',
    });

    // Convertir +20.000 en −150.000 dejaría la meta en −50.000.
    await expect(updateContribution(extra.id, { amount: -150_000 })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(await savedAmount(goal)).toBe(120_000);

    // Un retiro que sí cabe (excluyéndose a sí mismo del saldo) se acepta.
    await updateContribution(extra.id, { amount: -90_000 });
    expect(await savedAmount(goal)).toBe(10_000);
  });

  it('borrar un aporte inexistente lanza NotFoundError', async () => {
    await expect(deleteContribution('no-existe' as GoalContributionId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('borrar un aporte existente lo elimina', async () => {
    const goal = await addGoal('Viaje', 500_000);
    const row = await createContribution({ goalId: goal, amount: 50_000, date: '2026-07-01' });

    await deleteContribution(row.id);

    expect(await savedAmount(goal)).toBe(0);
  });
});
