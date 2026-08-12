import { describe, it, expect } from 'vitest';
import { cardUtilizationRule } from '@/lib/insights/rules/cardUtilization';
import {
  CARD_UTILIZATION_WARN,
  CARD_UTILIZATION_DANGER,
  CARD_UTILIZATION_CRITICAL,
} from '@/constants/config';
import { asCents } from '@/types/money';
import type { InsightContext } from '@/lib/insights/types';
import type { CardSummary } from '@/services/derive/cards';
import type { SettingsRow } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';
import type { IsoDate } from '@/types/common';

const settings = {
  currency: 'USD',
  locale: 'es',
} as SettingsRow;

/**
 * Construye una tarjeta con la utilización pedida. El cupo es fijo y la deuda se
 * deriva de él, para que `utilization` y `currentBalance` sean coherentes.
 */
function card(utilization: number, name = 'Visa'): CardSummary {
  const creditLimit = 1_000_000;
  return {
    card: {
      id: 'c1' as CreditCardId,
      name,
      bank: 'Banco',
      creditLimit: asCents(creditLimit),
      cutoffDay: 5,
      paymentDueDay: 20,
      color: '#000',
      isArchived: false,
      createdAt: '2026-01-01T00:00:00.000Z' as never,
      updatedAt: '2026-01-01T00:00:00.000Z' as never,
    },
    currentBalance: asCents(Math.round(creditLimit * utilization)),
    utilization,
    dueDate: '2026-07-20' as IsoDate,
    daysUntilDue: 5,
    status: 'open',
    isOverLimitWarning: utilization >= CARD_UTILIZATION_DANGER,
  };
}

const ctx = (cards: CardSummary[]) => ({ settings, cards }) as InsightContext;

describe('regla de utilización de tarjetas', () => {
  it('no dice nada si no hay tarjetas con deuda', () => {
    expect(cardUtilizationRule(ctx([]))).toBeNull();
    expect(cardUtilizationRule(ctx([card(0)]))).toBeNull();
  });

  it('felicita por debajo del umbral de aviso', () => {
    const insight = cardUtilizationRule(ctx([card(CARD_UTILIZATION_WARN - 0.01)]));
    expect(insight?.id).toBe('card-util-low');
    expect(insight?.severity).toBe('positive');
  });

  it('informa a partir del umbral de aviso', () => {
    const insight = cardUtilizationRule(ctx([card(CARD_UTILIZATION_WARN)]));
    expect(insight?.id).toBe('card-util-mid');
    expect(insight?.severity).toBe('info');
  });

  it('avisa a partir del umbral de peligro', () => {
    const insight = cardUtilizationRule(ctx([card(CARD_UTILIZATION_DANGER)]));
    expect(insight?.id).toBe('card-util-high');
    expect(insight?.severity).toBe('warning');
  });

  it('escala a crítico a partir del umbral crítico', () => {
    const insight = cardUtilizationRule(ctx([card(CARD_UTILIZATION_CRITICAL)]));
    expect(insight?.id).toBe('card-util-high');
    expect(insight?.severity).toBe('critical');
  });

  it('señala la tarjeta con peor utilización', () => {
    const insight = cardUtilizationRule(ctx([card(0.2, 'Baja'), card(0.85, 'Alta')]));
    expect(insight?.title).toContain('Alta');
  });

  it('los umbrales forman una escalera coherente', () => {
    expect(CARD_UTILIZATION_WARN).toBeLessThan(CARD_UTILIZATION_DANGER);
    expect(CARD_UTILIZATION_DANGER).toBeLessThan(CARD_UTILIZATION_CRITICAL);
  });
});
