import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from '@/components/forms/FormDialog';
import { ColorPicker } from '@/components/forms/ColorPicker';
import { IconPicker } from '@/components/forms/IconPicker';
import { CATEGORY_ICON_NAMES, categoryIcon } from '@/features/settings/lib/categoryIcons';
import { handleError } from '@/lib/handle-error';
import { DEFAULT_ENTITY_COLOR } from '@/constants/palette';
import { createCategory, updateCategory } from '@/services/categories.service';
import type { CategoryRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { CategoryId } from '@/types/ids';

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipo por defecto al crear. */
  defaultType: TransactionType;
  /** Categoría a editar (si se omite, se crea una nueva). */
  initial?: CategoryRow | undefined;
}

/** Crea o edita una categoría (nombre, color e icono). */
export function CategoryFormDialog({
  open,
  onOpenChange,
  defaultType,
  initial,
}: CategoryFormDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_ENTITY_COLOR);
  const [icon, setIcon] = useState(initial?.icon ?? 'ShoppingBag');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const type = initial?.type ?? defaultType;

  const submit = async () => {
    if (!name.trim()) return setError('Indica un nombre para la categoría.');
    setSubmitting(true);
    setError(null);
    try {
      if (initial) {
        await updateCategory(initial.id as CategoryId, { name: name.trim(), color, icon });
      } else {
        await createCategory({ name: name.trim(), type, color, icon });
      }
      onOpenChange(false);
    } catch (err) {
      handleError(err, 'No se pudo guardar la categoría');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? 'Editar categoría' : 'Nueva categoría'}
      description={type === 'expense' ? 'Categoría de gasto.' : 'Categoría de ingreso.'}
      submitLabel={initial ? 'Guardar' : 'Crear'}
      submitting={submitting}
      error={error}
      onSubmit={() => void submit()}
    >
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Transporte, Sueldo…"
          autoFocus
          maxLength={40}
        />
      </div>

      <IconPicker
        value={icon}
        onChange={setIcon}
        names={CATEGORY_ICON_NAMES}
        resolve={categoryIcon}
      />

      <ColorPicker value={color} onChange={setColor} />
    </FormDialog>
  );
}
