/**
 * Rutas centralizadas. Nunca usar strings de ruta mágicos dispersos por el
 * código (ADR-0009). Los `:param` se resuelven con las funciones auxiliares.
 */
export const ROUTES = {
  dashboard: '/',
  income: '/income',
  expenses: '/expenses',
  cards: '/cards',
  cardDetail: '/cards/:id',
  goals: '/goals',
  goalDetail: '/goals/:id',
  emergencyFund: '/emergency-fund',
  budget: '/budget',
  statistics: '/statistics',
  deposits: '/deposits',
  projections: '/projections',
  insights: '/insights',
  settings: '/settings',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Construye la ruta de detalle de una tarjeta. */
export function cardDetailPath(id: string): string {
  return `/cards/${id}`;
}

/** Construye la ruta de detalle de una meta. */
export function goalDetailPath(id: string): string {
  return `/goals/${id}`;
}
