import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

/** Página 404 para rutas no reconocidas. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Compass className="h-8 w-8" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">404</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          La página que buscas no existe o fue movida.
        </p>
      </div>
      <Button asChild>
        <Link to={ROUTES.dashboard}>Volver al dashboard</Link>
      </Button>
    </div>
  );
}
