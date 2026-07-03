import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { TagsInput } from '@/components/forms/TagsInput';
import { useCategories } from '@/hooks/useCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useSettings } from '@/hooks/useSettings';
import { handleError } from '@/lib/handle-error';
import { todayIso } from '@/lib/date';
import { currencySymbol } from '@/lib/currency';
import { ZERO_CENTS, type Cents } from '@/types/money';
import {
  createTransaction,
  updateTransaction,
  setTransactionAttachment,
} from '@/services/transactions.service';
import { addAttachment, deleteAttachment, getAttachment } from '@/services/attachments.service';
import type { TransactionRow } from '@/db/schema';
import type { TransactionType } from '@/types/common';
import type { TransactionId } from '@/types/ids';

const NONE = '__none__';

interface FormValues {
  amount: Cents;
  date: string;
  time: string;
  categoryId: string;
  paymentMethodId: string;
  description: string;
  notes: string;
  tags: string[];
}

interface TransactionFormProps {
  type: TransactionType;
  initial?: TransactionRow | undefined;
  onSubmitted: () => void;
  onCancel: () => void;
}

function toDefaults(initial?: TransactionRow): FormValues {
  return {
    amount: initial?.amount ?? ZERO_CENTS,
    date: initial?.date ?? todayIso(),
    time: initial?.time ?? '',
    categoryId: initial?.categoryId ?? '',
    paymentMethodId: initial?.paymentMethodId ?? '',
    description: initial?.description ?? '',
    notes: initial?.notes ?? '',
    tags: initial?.tags ?? [],
  };
}

/**
 * Formulario de alta/edición de un movimiento. Valida en el borde (campos
 * obligatorios) y delega la validación de dominio al servicio (Zod). El
 * comprobante (imagen) solo aplica a gastos.
 */
export function TransactionForm({ type, initial, onSubmitted, onCancel }: TransactionFormProps) {
  const settings = useSettings();
  const symbol = currencySymbol(settings.currency);
  const categories = useCategories(type);
  const paymentMethods = usePaymentMethods();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: toDefaults(initial) });

  // Comprobante (solo gastos).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExisting, setRemoveExisting] = useState(false);

  // Carga la vista previa del comprobante existente al editar.
  useEffect(() => {
    let objectUrl: string | null = null;
    let active = true;
    if (initial?.attachmentId) {
      void getAttachment(initial.attachmentId)
        .then((attachment) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(attachment.blob);
          setPreviewUrl(objectUrl);
        })
        .catch(() => {
          /* comprobante ausente: se ignora */
        });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [initial?.attachmentId]);

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    setFile(picked);
    setRemoveExisting(false);
    if (picked) {
      setPreviewUrl(URL.createObjectURL(picked));
    }
  };

  const clearAttachment = () => {
    setFile(null);
    setPreviewUrl(null);
    setRemoveExisting(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const base = {
        amount: values.amount,
        date: values.date,
        categoryId: values.categoryId,
        description: values.description,
        tags: values.tags,
        ...(values.time ? { time: values.time } : {}),
        ...(values.paymentMethodId && values.paymentMethodId !== NONE
          ? { paymentMethodId: values.paymentMethodId }
          : {}),
        ...(values.notes ? { notes: values.notes } : {}),
      };

      let transactionId: TransactionId;
      if (initial) {
        await updateTransaction(initial.id, { type, ...base });
        transactionId = initial.id;
      } else {
        const created = await createTransaction({ type, ...base });
        transactionId = created.id;
      }

      // Gestión del comprobante (solo gastos).
      if (type === 'expense') {
        if (file) {
          const newId = await addAttachment(transactionId, file);
          if (initial?.attachmentId) await deleteAttachment(initial.attachmentId);
          await setTransactionAttachment(transactionId, newId);
        } else if (removeExisting && initial?.attachmentId) {
          await deleteAttachment(initial.attachmentId);
          await setTransactionAttachment(transactionId, null);
        }
      }

      onSubmitted();
    } catch (error) {
      handleError(error, 'No se pudo guardar el movimiento');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Monto</Label>
          <Controller
            control={control}
            name="amount"
            rules={{ validate: (v) => v > 0 || 'Ingresa un monto mayor a cero.' }}
            render={({ field }) => (
              <MoneyInput
                id="amount"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                currencySymbol={symbol}
                autoFocus
                aria-invalid={Boolean(errors.amount)}
              />
            )}
          />
          {errors.amount ? (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Categoría</Label>
          <Controller
            control={control}
            name="categoryId"
            rules={{ required: 'Selecciona una categoría.' }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="categoryId" aria-invalid={Boolean(errors.categoryId)}>
                  <SelectValue placeholder="Elegir…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.categoryId ? (
            <p className="text-xs text-destructive">{errors.categoryId.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" {...register('date', { required: true })} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="time">Hora (opcional)</Label>
          <Input id="time" type="time" {...register('time')} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="paymentMethodId">Método de pago (opcional)</Label>
          <Controller
            control={control}
            name="paymentMethodId"
            render={({ field }) => (
              <Select
                value={field.value === '' ? NONE : field.value}
                onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
              >
                <SelectTrigger id="paymentMethodId">
                  <SelectValue placeholder="Sin método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin método</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Input id="description" placeholder="Ej. Almuerzo, taxi…" {...register('description')} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tags">Etiquetas (opcional)</Label>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagsInput id="tags" value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea id="notes" rows={2} {...register('notes')} />
      </div>

      {type === 'expense' ? (
        <div className="space-y-1.5">
          <Label>Comprobante (opcional)</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />
          {previewUrl ? (
            <div className="relative w-fit">
              <img
                src={previewUrl}
                alt="Comprobante"
                className="h-24 w-24 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={clearAttachment}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow"
                aria-label="Quitar comprobante"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
              Adjuntar foto
            </Button>
          )}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? 'Guardar cambios' : 'Registrar'}
        </Button>
      </div>
    </form>
  );
}
