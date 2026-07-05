import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar «{category.name}»</DialogTitle>
          <DialogDescription>
            {usage === null
              ? 'Comprobando movimientos asociados…'
              : needsReassign
                ? `Esta categoría tiene ${usage} movimiento(s). Elige una categoría de reemplazo para conservarlos.`
                : 'Esta categoría no tiene movimientos. Se eliminará de forma permanente.'}
          </DialogDescription>
        </DialogHeader>

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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            disabled={
              busy || usage === null || (needsReassign && (!reassignTo || options.length === 0))
            }
            onClick={() => void confirm()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
