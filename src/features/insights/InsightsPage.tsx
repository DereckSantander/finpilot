import { Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { InsightCard } from '@/features/insights/components/InsightCard';
import { useInsights } from '@/features/insights/hooks/useInsights';

/** Inteligencia financiera (F10b). Análisis automático accionable — Fase 9. */
export function InsightsPage() {
  const insights = useInsights();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inteligencia financiera"
        description="Análisis automático de tus datos con recomendaciones accionables."
      />

      {insights === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Sin recomendaciones por ahora"
          description="Registra ingresos, gastos y metas para que la inteligencia financiera analice tus datos y te sugiera mejoras."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
