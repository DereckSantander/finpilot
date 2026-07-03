import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';

/**
 * Error boundary a nivel de ruta (ADR-0006). Captura fallos de render/carga de
 * una pantalla sin tumbar toda la aplicación.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Algo salió mal';
  let message = 'Ocurrió un error al mostrar esta sección.';

  if (isRouteErrorResponse(error)) {
    title = `Error ${error.status}`;
    message = error.statusText || message;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(0)} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reintentar
        </Button>
        <Button onClick={() => navigate(ROUTES.dashboard)} className="gap-2">
          <Home className="h-4 w-4" />
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
