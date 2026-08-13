import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormDialog } from '@/components/forms/FormDialog';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { currencySymbol } from '@/lib/currency';
import { handleError } from '@/lib/handle-error';
import { CURRENCIES } from '@/constants/currencies';
import { completeOnboarding, updateSettings } from '@/services/settings.service';
import { createGoal } from '@/services/goals.service';
import { ZERO_CENTS, type Cents } from '@/types/money';
import type { Locale } from '@/types/common';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

const STEPS = ['Bienvenida', 'Ahorro', 'Primera meta'] as const;

/**
 * Asistente inicial (DEC-C), mínimo y **siempre saltable**.
 *
 * Se apoya en la bandera `settings.onboardingCompleted`, que existía en el
 * esquema desde el principio pero que nadie leía. Toda salida del diálogo
 * —terminar, omitir o cerrar con la X— la marca como completada, de modo que
 * no hay forma de quedarse atrapado ni de que reaparezca.
 */
export function OnboardingDialog() {
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const [currency, setCurrency] = useState(settings.currency);
  const [locale, setLocale] = useState<Locale>(settings.locale);
  const [savingsTarget, setSavingsTarget] = useState<Cents>(settings.monthlySavingsTarget);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState<Cents>(ZERO_CENTS);
  const [submitting, setSubmitting] = useState(false);

  const open = settings.onboardingCompleted === false;
  const isLastStep = step === STEPS.length - 1;

  /** Cierra el asistente para siempre, pase lo que pase. */
  const finish = async () => {
    setSubmitting(true);
    try {
      await completeOnboarding();
    } catch (err) {
      handleError(err, 'No se pudo guardar la configuración inicial');
    } finally {
      setSubmitting(false);
    }
  };

  const next = async () => {
    setSubmitting(true);
    try {
      if (step === 0) {
        await updateSettings({ currency, locale });
        setStep(1);
      } else if (step === 1) {
        await updateSettings({ monthlySavingsTarget: savingsTarget });
        setStep(2);
      } else {
        // La meta es opcional: si no se nombró, simplemente se termina.
        if (goalName.trim() && goalTarget > 0) {
          await createGoal({
            name: goalName.trim(),
            targetAmount: goalTarget,
            priority: 'medium',
            color: '#0d9488',
            icon: 'Target',
            isEmergencyFund: false,
          });
        }
        await completeOnboarding();
      }
    } catch (err) {
      handleError(err, 'No se pudo guardar la configuración inicial');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      // Cerrar con la X o con Escape cuenta como omitir: nunca reaparece.
      onOpenChange={(next) => {
        if (!next) void finish();
      }}
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Te damos la bienvenida a FinPilot
        </span>
      }
      description={`Paso ${step + 1} de ${STEPS.length} · ${STEPS[step]}. Puedes omitirlo y configurarlo luego.`}
      submitLabel={isLastStep ? 'Empezar' : 'Continuar'}
      // El botón de descarte ES la salida del asistente: cerrar por cualquier
      // vía lo marca como completado, así que no hay forma de quedarse dentro.
      cancelLabel="Omitir"
      submitting={submitting}
      onSubmit={() => void next()}
    >
      {step === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ob-currency">Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="ob-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-locale">Idioma / formato</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger id="ob-locale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-1.5">
          <Label htmlFor="ob-savings">¿Cuánto quieres ahorrar al mes?</Label>
          <MoneyInput
            id="ob-savings"
            value={savingsTarget}
            onChange={setSavingsTarget}
            currencySymbol={currencySymbol(currency)}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Se usa como referencia en el dashboard y en las recomendaciones.
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ob-goal-name">Tu primera meta (opcional)</Label>
            <Input
              id="ob-goal-name"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="Viaje, carro, fondo de emergencia…"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-goal-target">Objetivo</Label>
            <MoneyInput
              id="ob-goal-target"
              value={goalTarget}
              onChange={setGoalTarget}
              currencySymbol={currencySymbol(currency)}
            />
          </div>
        </div>
      ) : null}
    </FormDialog>
  );
}
