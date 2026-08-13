import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/forms/FormDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { handleError } from '@/lib/handle-error';
import { countCategoryUsage, deleteCategory } from '@/services/categories.service';
import type { CategoryRow } from '@/db/schema';
import type { CategoryId } from '@/types/ids';

interface DeleteCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: CategoryRow | null;
  /** Categorías activas del mismo tipo, para reasignar los movimientos. */
  reassignOptions: CategoryRow[];
}

/** Elimina una categoría; si tiene movimientos, exige reasignarlos a otra. */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  reassignOptions,
}: DeleteCategoryDialogProps) {
  const [usage, setUsage] = useState<number | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && category) {
      setUsage(null);
      setReassignTo('');
      void countCategoryUsage(category.id as CategoryId).then(setUsage);
    }
  }, [open, category]);

  if (!category) return null;

  const needsReassign = (usage ?? 0) > 0;
  const options = reassignOptions.filter((c) => c.id !== category.id);

  const confirm = async () => {
    if (needsReassign && !reassignTo) return;
    setBusy(true);
    try {
      await deleteCategory(
        category.id as CategoryId,
        needsReassign ? { reassignToId: reassignTo as CategoryId } : {},
      );
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo eliminar la categoría');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar «${category.name}»`}
      description={
        usage === null
          ? 'Comprobando movimientos asociados…'
          : needsReassign
            ? `Esta categoría tiene ${usage} movimiento(s). Elige una categoría de reemplazo para conservarlos.`
            : 'Esta categoría no tiene movimientos. Se eliminará de forma permanente.'
      }
      submitLabel="Eliminar"
      submitting={busy}
      submitDisabled={usage === null || (needsReassign && (!reassignTo || options.length === 0))}
      destructive
      onSubmit={() => void confirm()}
    >
      {needsReassign ? (
        <div className="space-y-1.5">
          <Label htmlFor="reassign">Reasignar movimientos a</Label>
          {options.length === 0 ? (
            <p className="text-sm text-destructive">
              No hay otra categoría del mismo tipo. Crea una antes de eliminar esta.
            </p>
          ) : (
            <Select value={reassignTo} onValueChange={setReassignTo}>
              <SelectTrigger id="reassign">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}
    </FormDialog>
  );
}
