import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  CreditCard as CardIcon,
  MoreVertical,
  Pencil,
  BellPlus,
  Archive,
  Trash2,
  CalendarClock,
  Scissors,
  Gauge,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { CreditCardVisual } from '@/features/credit-cards/components/CreditCardVisual';
import { ConsumoDialog } from '@/features/credit-cards/components/ConsumoDialog';
import { PaymentDialog } from '@/features/credit-cards/components/PaymentDialog';
import { CardFormDialog } from '@/features/credit-cards/components/CardFormDialog';
import { CardConsumptionChart } from '@/features/credit-cards/components/CardConsumptionChart';
import { CardMovementsList } from '@/features/credit-cards/components/CardMovementsList';
import {
  useCardDetail,
  useCardHistory,
  useCardMovements,
} from '@/features/credit-cards/hooks/useCreditCardsData';
import { useSettings } from '@/hooks/useSettings';
import { archiveCreditCard, deleteCreditCard } from '@/services/creditCards.service';
import { createReminder } from '@/services/reminders.service';
import { handleError } from '@/lib/handle-error';
import { formatMoney, formatPercent } from '@/lib/format';
import { formatDate } from '@/lib/date';
import { ROUTES } from '@/constants/routes';
import { CARD_UTILIZATION_DANGER } from '@/constants/config';
import type { CardSummary, CardDetail } from '@/services/metrics.service';
import type { SettingsRow } from '@/db/schema';
import type { CreditCardId } from '@/types/ids';

/** Detalle de una tarjeta (F04): consumos, pagos, utilización, historial y gráficos. */
export function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cardId = id as CreditCardId;
  const navigate = useNavigate();
  const settings = useSettings();

  const detail = useCardDetail(cardId);
  const history = useCardHistory(cardId, 6);
  const movements = useCardMovements(cardId);

  const [consumoOpen, setConsumoOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (detail === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full max-w-md rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const summary: CardSummary = {
    card: detail.card,
    currentBalance: detail.currentBalance,
    utilization: detail.utilization,
    dueDate: detail.dueDate,
    daysUntilDue: detail.daysUntilDue,
    status: detail.currentBalance === 0 ? 'paid' : 'open',
    isOverLimitWarning: detail.utilization >= CARD_UTILIZATION_DANGER,
  };

  const createPaymentReminder = async () => {
    try {
      await createReminder({
        title: `Pagar tarjeta ${detail.card.name}`,
        dueDate: detail.dueDate,
        relatedType: 'creditCard',
        relatedId: detail.card.id,
      });
      toast.success('Recordatorio creado', {
        description: `Pago de ${detail.card.name} el ${formatDate(detail.dueDate, 'd MMM', settings.locale)}.`,
      });
    } catch (error) {
      handleError(error, 'No se pudo crear el recordatorio');
    }
  };

  const archive = async () => {
    try {
      await archiveCreditCard(detail.card.id);
      toast.success('Tarjeta archivada');
      navigate(ROUTES.cards);
    } catch (error) {
      handleError(error, 'No se pudo archivar la tarjeta');
    }
  };

  const remove = async () => {
    try {
      await deleteCreditCard(detail.card.id);
      toast.success('Tarjeta eliminada');
      navigate(ROUTES.cards);
    } catch (error) {
      handleError(error, 'No se pudo eliminar la tarjeta');
    }
  };

  const reversedHistory = [...(history ?? [])].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 pl-1">
          <Link to={ROUTES.cards}>
            <ArrowLeft className="h-4 w-4" />
            Tarjetas
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setConsumoOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Consumo</span>
          </Button>
          <Button className="gap-2" onClick={() => setPaymentOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Pago</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void createPaymentReminder()}>
                <BellPlus /> Crear recordatorio
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void archive()}>
                <Archive /> Archivar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleteOpen(true)}
              >
                <Trash2 /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="space-y-4">
          <CreditCardVisual summary={summary} settings={settings} />
          <KpiGrid detail={detail} settings={settings} />
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumos vs. pagos (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {reversedHistory.some((h) => h.consumo > 0 || h.pago > 0) ? (
              <div className="h-64">
                <CardConsumptionChart history={history ?? []} settings={settings} />
              </div>
            ) : (
              <EmptyState
                icon={Gauge}
                title="Sin historial todavía"
                description="Registra consumos y pagos para ver la evolución."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <CardMovementsList movements={movements ?? []} settings={settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Historial mensual</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-4 gap-2 border-b border-border px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
              <span>Mes</span>
              <span className="text-right">Consumos</span>
              <span className="text-right">Pagos</span>
              <span className="text-right">Balance</span>
            </div>
            {reversedHistory.map((h) => (
              <div
                key={h.yearMonth}
                className="grid grid-cols-4 gap-2 border-b border-border/60 px-4 py-2.5 text-sm tabular-nums last:border-0"
              >
                <span className="capitalize">{h.label}</span>
                <span className="text-right text-destructive">
                  {formatMoney(h.consumo, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span className="text-right text-success">
                  {formatMoney(h.pago, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                  })}
                </span>
                <span className="text-right font-medium">
                  {formatMoney(h.balance, {
                    currency: settings.currency,
                    locale: settings.locale,
                    hideZeroDecimals: true,
                    signDisplay: 'exceptZero',
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConsumoDialog cardId={cardId} open={consumoOpen} onOpenChange={setConsumoOpen} />
      <PaymentDialog
        cardId={cardId}
        suggestedAmount={detail.currentBalance}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
      <CardFormDialog open={editOpen} onOpenChange={setEditOpen} initial={detail.card} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar tarjeta"
        description="Solo puede eliminarse una tarjeta sin historial. Si tiene movimientos, archívala."
        confirmLabel="Eliminar"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

function KpiGrid({ detail, settings }: { detail: CardDetail; settings: SettingsRow }) {
  const money = (value: CardDetail['currentBalance']) =>
    formatMoney(value, { currency: settings.currency, locale: settings.locale });

  const rows: { icon: typeof Wallet; label: string; value: string; hint?: string }[] = [
    { icon: Wallet, label: 'Cupo disponible', value: money(detail.available) },
    {
      icon: Gauge,
      label: 'Utilización',
      value: formatPercent(detail.utilization, settings.locale),
    },
    {
      icon: CalendarClock,
      label: 'Próximo pago',
      value: formatDate(detail.dueDate, 'd MMM', settings.locale),
      hint: detail.daysUntilDue === 0 ? 'Hoy' : `en ${detail.daysUntilDue} día(s)`,
    },
    {
      icon: Scissors,
      label: 'Próximo corte',
      value: formatDate(detail.cutoffDate, 'd MMM', settings.locale),
    },
    { icon: CardIcon, label: 'Consumo del mes', value: money(detail.monthConsumo) },
    { icon: CardIcon, label: 'Pagos del mes', value: money(detail.monthPago) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <Card key={row.label}>
            <CardContent className="space-y-1 p-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {row.label}
              </span>
              <p className="truncate text-lg font-semibold tabular-nums">{row.value}</p>
              {row.hint ? <p className="text-xs text-muted-foreground">{row.hint}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
