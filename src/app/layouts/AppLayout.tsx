import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, SidebarNav } from '@/app/layouts/Sidebar';
import { Topbar } from '@/app/layouts/Topbar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { QuickAddExpenseDialog } from '@/features/transactions/components/QuickAddExpenseDialog';

/**
 * Layout raíz de la aplicación (architecture.md §6): sidebar persistente en
 * escritorio, panel deslizable en móvil, barra superior y área de contenido con
 * el <Outlet/> de las rutas.
 */
export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Cierra el panel móvil al cambiar de ruta.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-full min-h-screen bg-background">
      <Sidebar />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl animate-fade-in-up px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Diálogo global de gasto rápido (accesible desde cualquier ruta). */}
      <QuickAddExpenseDialog />
    </div>
  );
}
