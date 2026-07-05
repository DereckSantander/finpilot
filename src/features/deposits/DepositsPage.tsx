import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { DepositSimulator } from '@/features/deposits/components/DepositSimulator';
import { ScenarioComparison } from '@/features/deposits/components/ScenarioComparison';
import { useDeposits } from '@/features/deposits/hooks/useDeposits';
import { useSettings } from '@/hooks/useSettings';

/** Pólizas (F09). Simulador de depósitos a plazo y comparación de escenarios — Fase 8. */
export function DepositsPage() {
  const settings = useSettings();
  const scenarios = useDeposits();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pólizas"
        description="Simula depósitos a plazo y compara la rentabilidad de distintos escenarios."
      />

      <DepositSimulator />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Escenarios guardados</h2>
        {scenarios === undefined ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : scenarios.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="Aún no guardas escenarios"
            description="Ajusta los parámetros del simulador y pulsa “Guardar escenario” para compararlos aquí."
          />
        ) : (
          <ScenarioComparison scenarios={scenarios} settings={settings} />
        )}
      </section>
    </div>
  );
}
