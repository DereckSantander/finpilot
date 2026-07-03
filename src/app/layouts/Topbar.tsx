import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/app/layouts/ThemeToggle';
import { useQuickAddStore } from '@/stores/quickAdd.store';

interface TopbarProps {
  /** Abre el panel de navegación en móvil. */
  onOpenMobileNav: () => void;
}

/** Barra superior: menú móvil, acción de gasto rápido y selector de tema. */
export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const openQuickAdd = useQuickAddStore((state) => state.openQuickAdd);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir navegación"
      >
        <Menu />
      </Button>

      <div className="flex-1" />

      <Button onClick={openQuickAdd} size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Gasto rápido</span>
      </Button>

      <ThemeToggle />
    </header>
  );
}
