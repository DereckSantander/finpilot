import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';

/** Inteligencia financiera (F10b). Análisis automático accionable — Fase 9. */
export function InsightsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inteligencia financiera"
        description="Análisis automático de tus datos con recomendaciones accionables."
      />
      <EmptyState
        icon={Sparkles}
        title="Sin análisis todavía"
        description="El motor de insights (comparativas de gasto, oportunidades de ahorro, avance de metas) llega en la Fase 9."
      />
    </div>
  );
}
