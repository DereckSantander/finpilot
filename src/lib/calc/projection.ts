import { asCents, type Cents } from '@/types/money';

export interface ProjectionPoint {
  year: number; // 0 = hoy
  label: string;
  value: Cents; // patrimonio/ahorro proyectado
}

/**
 * Proyecta el crecimiento del ahorro con aportes mensuales e interés compuesto
 * (capitalización mensual). Función pura (features.md F10). Montos en centavos.
 *
 *   balanceₘ = balanceₘ₋₁ · (1 + r/12) + aporteMensual
 */
export function projectSavings(params: {
  initial: number;
  monthly: number;
  years: number;
  annualRate: number; // decimal (0.05 = 5%)
}): ProjectionPoint[] {
  const { initial, monthly, years, annualRate } = params;
  const monthlyRate = annualRate / 12;

  const points: ProjectionPoint[] = [
    { year: 0, label: 'Hoy', value: asCents(Math.round(initial)) },
  ];
  let balance = initial;
  for (let month = 1; month <= years * 12; month += 1) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (month % 12 === 0) {
      const year = month / 12;
      points.push({
        year,
        label: year === 1 ? '1 año' : `${year} años`,
        value: asCents(Math.round(balance)),
      });
    }
  }
  return points;
}
