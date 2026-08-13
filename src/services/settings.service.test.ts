import { describe, it, expect, beforeEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  unlinkEmergencyFundGoal,
  completeOnboarding,
  restartOnboarding,
} from '@/services/settings.service';
import { resetDb, patchSettings } from '@/test/seed';
import { ValidationError } from '@/lib/errors';
import type { GoalId } from '@/types/ids';

/**
 * `db.settings.update` solo fusiona el primer nivel, así que un parche parcial
 * de `autoBackup`/`emergencyFund` borraba los campos hermanos.
 */
describe('configuración global', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('un parche parcial de autoBackup conserva los campos hermanos', async () => {
    await updateSettings({ autoBackup: { enabled: true } });

    const settings = await getSettings();
    expect(settings.autoBackup).toEqual({ enabled: true, frequencyDays: 7, keep: 5 });
  });

  it('un parche parcial de emergencyFund conserva los campos hermanos', async () => {
    const goal = 'goal-1' as GoalId;
    await updateSettings({ emergencyFund: { linkedGoalId: goal } });

    const settings = await getSettings();
    expect(settings.emergencyFund.targetMonths).toEqual([3, 6, 12]);
    expect(settings.emergencyFund.linkedGoalId).toBe(goal);
  });

  it('cambiar targetMonths no borra el vínculo con la meta', async () => {
    const goal = 'goal-1' as GoalId;
    await updateSettings({ emergencyFund: { linkedGoalId: goal } });

    await updateSettings({ emergencyFund: { targetMonths: [6, 12] } });

    const settings = await getSettings();
    expect(settings.emergencyFund.targetMonths).toEqual([6, 12]);
    expect(settings.emergencyFund.linkedGoalId).toBe(goal);
  });

  it('los campos planos se actualizan sin tocar los anidados', async () => {
    await updateSettings({ currency: 'EUR', theme: 'dark' });

    const settings = await getSettings();
    expect(settings.currency).toBe('EUR');
    expect(settings.theme).toBe('dark');
    expect(settings.autoBackup.frequencyDays).toBe(7);
  });

  it('unlinkEmergencyFundGoal borra el vínculo y conserva el resto', async () => {
    await updateSettings({ emergencyFund: { linkedGoalId: 'goal-1' as GoalId } });

    await unlinkEmergencyFundGoal();

    const settings = await getSettings();
    expect(settings.emergencyFund.linkedGoalId).toBeUndefined();
    expect(settings.emergencyFund.targetMonths).toEqual([3, 6, 12]);
  });

  it('completeOnboarding marca la bandera sin tocar el resto', async () => {
    await patchSettings({ onboardingCompleted: false });
    await updateSettings({ currency: 'EUR', autoBackup: { enabled: true } });

    await completeOnboarding();

    const settings = await getSettings();
    expect(settings.onboardingCompleted).toBe(true);
    // Doble función: también es el test de regresión del merge anidado.
    expect(settings.currency).toBe('EUR');
    expect(settings.autoBackup).toEqual({ enabled: true, frequencyDays: 7, keep: 5 });
  });

  it('completeOnboarding es idempotente y restartOnboarding lo revierte', async () => {
    await completeOnboarding();
    await completeOnboarding();
    expect((await getSettings()).onboardingCompleted).toBe(true);

    await restartOnboarding();
    expect((await getSettings()).onboardingCompleted).toBe(false);
  });

  it('rechaza valores inválidos sin escribir nada', async () => {
    await expect(updateSettings({ autoBackup: { keep: -1 } })).rejects.toBeInstanceOf(
      ValidationError,
    );

    expect((await getSettings()).autoBackup.keep).toBe(5);
  });
});
