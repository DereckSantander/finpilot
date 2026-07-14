import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, CreditCard, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PaymentMethodFormDialog } from '@/features/settings/components/PaymentMethodFormDialog';
import {
  useAllPaymentMethods,
  useActiveCreditCards,
} from '@/features/settings/hooks/usePaymentMethodsAdmin';
import { archivePaymentMethod, deletePaymentMethod } from '@/services/paymentMethods.service';
import { handleError } from '@/lib/handle-error';
import { cn } from '@/lib/cn';
import type { PaymentMethodRow } from '@/db/schema';
import type { PaymentMethodId } from '@/types/ids';

/**
 * Gestión de métodos de pago. Un método de tipo crédito vinculado a una tarjeta
 * convierte cualquier gasto pagado con él en consumo (y deuda) de esa tarjeta.
 */
export function PaymentMethodsCard() {
  const methods = useAllPaymentMethods();
  const cards = useActiveCreditCards();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodRow | undefined>(undefined);
  const [deleting, setDeleting] = useState<PaymentMethodRow | null>(null);

  const cardName = (id: string) => cards.find((c) => c.id === id)?.name ?? 'Tarjeta';

  const list = (methods ?? []).sort(
    (a, b) => Number(a.isArchived) - Number(b.isArchived) || a.name.localeCompare(b.name),
  );

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (method: PaymentMethodRow) => {
    setEditing(method);
    setFormOpen(true);
  };

  const toggleArchive = async (method: PaymentMethodRow) => {
    try {
      await archivePaymentMethod(method.id as PaymentMethodId, !method.isArchived);
    } catch (err) {
      handleError(err, 'No se pudo actualizar el método de pago');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deletePaymentMethod(deleting.id as PaymentMethodId, { detachTransactions: true });
      setDeleting(null);
    } catch (err) {
      handleError(err, 'No se pudo eliminar el método de pago');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Métodos de pago</CardTitle>
          <CardDescription>Cómo pagas: efectivo, débito, transferencia o tarjeta.</CardDescription>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {methods === undefined ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay métodos de pago registrados.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {list.map((method) => (
              <li
                key={method.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-3 py-2.5',
                  method.isArchived && 'opacity-60',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    {method.creditCardId ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </span>
                  <span className="truncate text-sm font-medium">{method.name}</span>
                  {method.creditCardId ? (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {cardName(method.creditCardId)}
                    </Badge>
                  ) : null}
                  {method.isArchived ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Archivado
                    </Badge>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(method)}
                    aria-label={`Editar ${method.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => void toggleArchive(method)}
                    aria-label={
                      method.isArchived ? `Restaurar ${method.name}` : `Archivar ${method.name}`
                    }
                  >
                    {method.isArchived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleting(method)}
                    aria-label={`Eliminar ${method.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CreditCard className="h-3.5 w-3.5" />
          Vincula un método a una tarjeta para que sus gastos sumen a la deuda de esa tarjeta.
        </p>
      </CardContent>

      {formOpen ? (
        <PaymentMethodFormDialog open={formOpen} onOpenChange={setFormOpen} initial={editing} />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`¿Eliminar «${deleting?.name ?? ''}»?`}
        description="Los movimientos que lo usaban quedarán sin método de pago. Los consumos ya registrados en una tarjeta siguen contando como deuda."
        confirmLabel="Eliminar"
        destructive
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
