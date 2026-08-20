import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { KpiDetailDialog } from '@/features/dashboard/components/KpiDetailDialog';
import { cn } from '@/lib/cn';
import type { KpiExplanation } from '@/features/dashboard/lib/kpiExplain';
import type { SettingsRow } from '@/db/schema';

interface ExplainableCardProps {
  /** Nombre del indicador; encabeza el diálogo y da nombre accesible al botón. */
  title: string;
  explanation: KpiExplanation;
  settings: SettingsRow;
  className?: string;
  children: ReactNode;
}

/**
 * Tarjeta del dashboard que, al pulsarla, explica de dónde sale su cifra.
 *
 * Es un `<button>` de verdad y no un `div` con `onClick`: así el indicador es
 * alcanzable con el teclado y los lectores de pantalla lo anuncian como acción.
 */
export function ExplainableCard({
  title,
  explanation,
  settings,
  className,
  children,
}: ExplainableCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className={cn('transition-colors hover:border-primary/40', className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${title}: ver cómo se calcula`}
          className="w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {children}
        </button>
      </Card>

      <KpiDetailDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        explanation={explanation}
        settings={settings}
      />
    </>
  );
}
