import type { TransactionType } from '@/types/common';

/**
 * Categorías semilla (se insertan en la primera creación de la base de datos,
 * ver db/seed.ts). Son editables por el usuario; `isSystem` solo evita el
 * borrado accidental. Colores en HSL de la paleta para los gráficos.
 */

export interface SeedCategory {
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
}

export const SEED_EXPENSE_CATEGORIES: readonly SeedCategory[] = [
  { name: 'Transporte', type: 'expense', color: '#0ea5e9', icon: 'Bus' },
  { name: 'Alimentación', type: 'expense', color: '#f59e0b', icon: 'UtensilsCrossed' },
  { name: 'Celular', type: 'expense', color: '#6366f1', icon: 'Smartphone' },
  { name: 'Tarjeta de crédito', type: 'expense', color: '#ef4444', icon: 'CreditCard' },
  { name: 'Novia', type: 'expense', color: '#ec4899', icon: 'Heart' },
  { name: 'Compras', type: 'expense', color: '#8b5cf6', icon: 'ShoppingBag' },
  { name: 'Entretenimiento', type: 'expense', color: '#14b8a6', icon: 'Gamepad2' },
  { name: 'Salud', type: 'expense', color: '#22c55e', icon: 'HeartPulse' },
  { name: 'Viajes', type: 'expense', color: '#f97316', icon: 'Plane' },
  { name: 'Otros', type: 'expense', color: '#94a3b8', icon: 'Ellipsis' },
];

export const SEED_INCOME_CATEGORIES: readonly SeedCategory[] = [
  { name: 'Sueldo', type: 'income', color: '#0d9488', icon: 'Briefcase' },
  { name: 'Bonificaciones', type: 'income', color: '#16a34a', icon: 'Gift' },
  { name: 'Ingresos extra', type: 'income', color: '#0891b2', icon: 'PlusCircle' },
  { name: 'Otros', type: 'income', color: '#64748b', icon: 'Ellipsis' },
];

export const SEED_CATEGORIES: readonly SeedCategory[] = [
  ...SEED_INCOME_CATEGORIES,
  ...SEED_EXPENSE_CATEGORIES,
];

/** Métodos de pago semilla. */
export interface SeedPaymentMethod {
  name: string;
  type: 'cash' | 'debit' | 'credit' | 'transfer' | 'other';
}

export const SEED_PAYMENT_METHODS: readonly SeedPaymentMethod[] = [
  { name: 'Efectivo', type: 'cash' },
  { name: 'Tarjeta de débito', type: 'debit' },
  { name: 'Transferencia', type: 'transfer' },
];
