import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CATEGORY_ICON_NAMES, categoryIcon } from '@/features/settings/lib/categoryIcons';
import { handleError } from '@/lib/handle-error';
import { cn } from '@/lib/cn';
import { createCategory, updateCategory } from '@/services/categories.service';
import type { CategoryRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { CategoryId } from '@/types/ids';

const COLORS = [
  '#0d9488',
  '#6366f1',
  '#e11d48',
  '#f59e0b',
  '#8b5cf6',
  '#0ea5e9',
  '#16a34a',
  '#94a3b8',
];

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
  const [color, setColor] = useState(initial?.color ?? COLORS[0]!);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          <DialogDescription>
            {type === 'expense' ? 'Categoría de gasto.' : 'Categoría de ingreso.'}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
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

          <div className="space-y-1.5">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICON_NAMES.map((iconName) => {
                const Icon = categoryIcon(iconName);
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border transition',
                      icon === iconName
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                    aria-label={iconName}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition',
                    color === c && 'ring-2 ring-ring',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {initial ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
