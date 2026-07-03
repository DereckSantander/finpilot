import { Landmark } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

/** Pólizas (F09). Simulador de depósitos a plazo y escenarios — Fase 8. */
export function DepositsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pólizas"
        description="Simula depósitos a plazo y compara la rentabilidad de distintos escenarios."
      />
      <EmptyState
        icon={Landmark}
        title="Sin simulaciones todavía"
        description="El simulador de depósitos a plazo (capital, interés, tiempo, periodicidad) llega en la Fase 8."
      />
    </div>
  );
}
