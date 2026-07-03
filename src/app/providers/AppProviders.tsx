import type { ReactNode } from 'react';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { SettingsProvider } from '@/app/providers/SettingsProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';

/**
 * Composición de todos los proveedores globales. Orden: tema (más externo) →
 * configuración → tooltips. El Toaster (sonner) se monta junto a la app.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
