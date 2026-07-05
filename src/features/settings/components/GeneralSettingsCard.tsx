import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoneyInput } from '@/components/forms/MoneyInput';
import { useSettings } from '@/hooks/useSettings';
import { handleError } from '@/lib/handle-error';
import { currencySymbol } from '@/lib/currency';
import { updateSettings } from '@/services/settings.service';
import { CURRENCIES } from '@/constants/currencies';
import { SCHEMA_VERSION } from '@/constants/config';
import type { Cents } from '@/types/money';
import type { Locale } from '@/types/common';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
];

/** Preferencias generales editables: moneda, idioma, mes, ahorro, fondo y respaldo (F12). */
export function GeneralSettingsCard() {
  const settings = useSettings();

  const [currency, setCurrency] = useState(settings.currency);
  const [locale, setLocale] = useState<Locale>(settings.locale);
  const [startOfMonth, setStartOfMonth] = useState(String(settings.startOfMonth));
  const [savingsTarget, setSavingsTarget] = useState<Cents>(settings.monthlySavingsTarget);
  const [emergencyMonths, setEmergencyMonths] = useState(
    settings.emergencyFund.targetMonths.join(', '),
  );
  const [freqDays, setFreqDays] = useState(String(settings.autoBackup.frequencyDays));
  const [keep, setKeep] = useState(String(settings.autoBackup.keep));
  const [saving, setSaving] = useState(false);

  const dirty =
    currency !== settings.currency ||
    locale !== settings.locale ||
    startOfMonth !== String(settings.startOfMonth) ||
    savingsTarget !== settings.monthlySavingsTarget ||
    emergencyMonths !== settings.emergencyFund.targetMonths.join(', ') ||
    freqDays !== String(settings.autoBackup.frequencyDays) ||
    keep !== String(settings.autoBackup.keep);

  const save = async () => {
    const day = Math.trunc(Number(startOfMonth));
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      toast.error('El inicio de mes debe ser un día entre 1 y 28.');
      return;
    }
    const months = Array.from(
      new Set(
        emergencyMonths
          .split(',')
          .map((n) => Math.trunc(Number(n.trim())))
          .filter((n) => Number.isInteger(n) && n > 0),
      ),
    ).sort((a, b) => a - b);
    if (months.length === 0) {
      toast.error('Indica al menos un objetivo de fondo de emergencia (en meses).');
      return;
    }
    const frequencyDays = Math.trunc(Number(freqDays));
    const keepN = Math.trunc(Number(keep));
    if (frequencyDays < 1 || keepN < 1) {
      toast.error('La frecuencia y la cantidad de respaldos deben ser mayores a cero.');
      return;
    }

    setSaving(true);
    try {
      await updateSettings({
        currency,
        locale,
        startOfMonth: day,
        monthlySavingsTarget: savingsTarget,
        emergencyFund: { ...settings.emergencyFund, targetMonths: months },
        autoBackup: { ...settings.autoBackup, frequencyDays, keep: keepN },
      });
      toast.success('Preferencias guardadas.');
    } catch (err) {
      handleError(err, 'No se pudieron guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="space-y-1.5">
          <CardTitle>Preferencias</CardTitle>
          <CardDescription>Moneda, idioma, ciclo mensual y objetivos.</CardDescription>
        </div>
        <Badge variant="secondary">Esquema v{SCHEMA_VERSION}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="set-currency">Moneda</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="set-currency">
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
            <Label htmlFor="set-locale">Idioma / formato</Label>
            <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
              <SelectTrigger id="set-locale">
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

          <div className="space-y-1.5">
            <Label htmlFor="set-som">Inicio de mes (día)</Label>
            <Input
              id="set-som"
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              value={startOfMonth}
              onChange={(e) => setStartOfMonth(e.target.value)}
              className="tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="set-savings">Meta de ahorro mensual</Label>
            <MoneyInput
              id="set-savings"
              value={savingsTarget}
              onChange={setSavingsTarget}
              currencySymbol={currencySymbol(currency)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="set-emergency">Objetivos del fondo (meses)</Label>
            <Input
              id="set-emergency"
              value={emergencyMonths}
              onChange={(e) => setEmergencyMonths(e.target.value)}
              placeholder="3, 6, 12"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="set-freq">Respaldo cada (días)</Label>
              <Input
                id="set-freq"
                type="number"
                inputMode="numeric"
                min="1"
                value={freqDays}
                onChange={(e) => setFreqDays(e.target.value)}
                className="tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="set-keep">Conservar</Label>
              <Input
                id="set-keep"
                type="number"
                inputMode="numeric"
                min="1"
                value={keep}
                onChange={(e) => setKeep(e.target.value)}
                className="tabular-nums"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={!dirty || saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
