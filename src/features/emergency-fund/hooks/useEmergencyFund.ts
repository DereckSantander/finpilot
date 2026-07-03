import { useLiveQuery } from 'dexie-react-hooks';
import { emergencyFundStatusQuery, type EmergencyFundStatus } from '@/services/metrics.service';

/** Estado reactivo del fondo de emergencia (cobertura, hitos, gasto medio). */
export function useEmergencyFund(averageWindow = 3): EmergencyFundStatus | undefined {
  return useLiveQuery(() => emergencyFundStatusQuery(averageWindow), [averageWindow]);
}
