import { PageHeader } from '@/components/common/PageHeader';
import { ThemeToggle } from '@/app/layouts/ThemeToggle';
import { GeneralSettingsCard } from '@/features/settings/components/GeneralSettingsCard';
import { CategoriesCard } from '@/features/settings/components/CategoriesCard';
import { DataBackupCard } from '@/features/settings/components/DataBackupCard';

/**
 * Configuración (F12). Preferencias editables (moneda, idioma, ciclo mensual,
 * objetivos), gestión de categorías, tema y exportación/respaldo (F11).
 */
export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Preferencias de la aplicación, categorías y respaldos."
        actions={<ThemeToggle />}
      />

      <GeneralSettingsCard />
      <CategoriesCard />
      <DataBackupCard />
    </div>
  );
}
