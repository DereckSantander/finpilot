import { useLiveQuery } from 'dexie-react-hooks';
import { depositScenariosQuery } from '@/services/deposits.service';
import type { DepositScenarioRow } from '@/db/schema';

/** Escenarios de depósito guardados, ordenados por fecha (reactivo). */
export function useDeposits(): DepositScenarioRow[] | undefined {
  return useLiveQuery(() => depositScenariosQuery(), []);
}
