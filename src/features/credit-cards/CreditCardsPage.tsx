import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, TrendingDown, Gauge, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditCardVisual } from '@/features/credit-cards/components/CreditCardVisual';
import { CardFormDialog } from '@/features/credit-cards/components/CardFormDialog';
import { PaymentsCalendar } from '@/features/credit-cards/components/PaymentsCalendar';
import { CardAlerts } from '@/features/credit-cards/components/CardAlerts';
import { useCreditCards } from '@/features/credit-cards/hooks/useCreditCardsData';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney, formatPercent } from '@/lib/format';
import { cardDetailPath } from '@/constants/routes';
import { sumCents } from '@/lib/money';
import { asCents } from '@/types/money';

/** Tarjetas de crédito (F04): listado con utilización, calendario de pagos y alertas. */
export function CreditCardsPage() {
  const settings = useSettings();
  const navigate = useNavigate();
  const cards = useCreditCards();
  const [dialogOpen, setDialogOpen] = useState(false);

  const totals = useMemo(() => {
    const list = cards ?? [];
    const debt = sumCents(list.map((c) => c.currentBalance));
    const limit = sumCents(list.map((c) => c.card.creditLimit));
    const available = asCents(Math.max(limit - debt, 0));
    const utilization = limit > 0 ? debt / limit : 0;
    return { debt, limit, available, utilization };
  }, [cards]);

  const loading = cards === undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarjetas de crédito"
        description="Controla cupos, consumos, pagos y fechas de corte."
        actions={
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva tarjeta</span>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin tarjetas registradas"
          description="Registra tus tarjetas de crédito para controlar cupos, consumos y pagos."
          action={
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva tarjeta
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              icon={TrendingDown}
              label="Deuda total"
              value={formatMoney(totals.debt, {
                currency: settings.currency,
                locale: settings.locale,
              })}
              intent="negative"
            />
            <SummaryCard
              icon={Wallet}
              label="Cupo disponible"
              value={formatMoney(totals.available, {
                currency: settings.currency,
                locale: settings.locale,
              })}
              intent="positive"
            />
            <SummaryCard
              icon={Gauge}
              label="Utilización global"
              value={formatPercent(totals.utilization, settings.locale)}
            />
          </div>

          <CardAlerts cards={cards} settings={settings} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map((summary) => (
              <CreditCardVisual
                key={summary.card.id}
                summary={summary}
                settings={settings}
                onClick={() => navigate(cardDetailPath(summary.card.id))}
              />
            ))}
          </div>

          <PaymentsCalendar cards={cards} />
        </>
      )}

      <CardFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  intent = 'default',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  intent?: 'default' | 'positive' | 'negative';
}) {
  const valueClass =
    intent === 'positive'
      ? 'text-success'
      : intent === 'negative'
        ? 'text-destructive'
        : 'text-foreground';
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}
