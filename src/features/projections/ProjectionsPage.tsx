import { LineChart } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

/** Proyecciones (F10). Simulación a 1/3/5/10/15/20 años — Fase 8. */
export function ProjectionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyecciones"
        description="Proyecta tu patrimonio a futuro con distintos niveles de ahorro."
      />
      <EmptyState
        icon={LineChart}
        title="Sin proyecciones todavía"
        description="Las simulaciones a 1, 3, 5, 10, 15 y 20 años llegan en la Fase 8."
      />
    </div>
  );
}
