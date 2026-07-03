import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/app/layouts/ThemeToggle';
import { useSettings } from '@/hooks/useSettings';
import { formatMoney } from '@/lib/format';
import { SCHEMA_VERSION } from '@/constants/config';

/**
 * Configuración (F12). En la Fase 1 muestra la configuración real cargada desde
 * IndexedDB (prueba de que la base de datos y el SettingsProvider funcionan). La
 * edición completa (moneda, categorías, respaldos) llega en la Fase 11.
 */
export function SettingsPage() {
  const settings = useSettings();

  const rows: { label: string; value: string }[] = [
    { label: 'Moneda', value: settings.currency },
    { label: 'Idioma', value: settings.locale === 'es' ? 'Español' : 'Inglés' },
    {
      label: 'Tema',
      value:
        settings.theme === 'system' ? 'Sistema' : settings.theme === 'dark' ? 'Oscuro' : 'Claro',
    },
    { label: 'Inicio de mes', value: `Día ${settings.startOfMonth}` },
    {
      label: 'Meta de ahorro mensual',
      value: formatMoney(settings.monthlySavingsTarget, {
        currency: settings.currency,
        locale: settings.locale,
      }),
    },
    {
      label: 'Fondo de emergencia',
      value: `${settings.emergencyFund.targetMonths.join(' / ')} meses`,
    },
    {
      label: 'Respaldo automático',
      value: settings.autoBackup.enabled
        ? `Cada ${settings.autoBackup.frequencyDays} días (guardar ${settings.autoBackup.keep})`
        : 'Desactivado',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Preferencias de la aplicación."
        actions={<ThemeToggle />}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle>Preferencias actuales</CardTitle>
            <CardDescription>Valores cargados desde la base de datos local.</CardDescription>
          </div>
          <Badge variant="secondary">Esquema v{SCHEMA_VERSION}</Badge>
        </CardHeader>
        <CardContent className="space-y-0">
          {rows.map((row, index) => (
            <div key={row.label}>
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        La edición de moneda, categorías, objetivos y respaldos estará disponible en la Fase 11.
      </p>
    </div>
  );
}
