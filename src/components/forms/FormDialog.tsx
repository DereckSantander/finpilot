import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Acepta nodos para títulos con icono, no solo texto. */
  title: ReactNode;
  description?: ReactNode;
  /** Texto del botón de envío. Por defecto "Guardar". */
  submitLabel?: string;
  /** Deshabilita el envío y muestra el spinner. */
  submitting?: boolean;
  /** Deshabilita el envío por reglas propias del formulario (además de `submitting`). */
  submitDisabled?: boolean;
  /** Pinta el botón de envío como acción destructiva (eliminar). */
  destructive?: boolean;
  /** Texto del botón de descarte. Por defecto "Cancelar". */
  cancelLabel?: string;
  /** Mensaje de error del formulario (se muestra sobre el pie). */
  error?: string | null;
  onSubmit: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Andamiaje común de los diálogos de formulario: cabecera, `<form>`, línea de
 * error y pie Cancelar/Guardar con spinner.
 *
 * Los doce diálogos de la app repetían esta estructura byte a byte; solo cambian
 * los campos. El tope de altura y el scroll interno los aporta `DialogContent`,
 * así que cualquier formulario que crezca sigue siendo usable en pantallas bajas.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = 'Guardar',
  submitting = false,
  submitDisabled = false,
  destructive = false,
  cancelLabel = 'Cancelar',
  error,
  onSubmit,
  children,
  className,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {children}

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={submitting || submitDisabled}
              className="gap-2"
              {...(destructive ? { variant: 'destructive' as const } : {})}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
