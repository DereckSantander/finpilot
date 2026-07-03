import { Loader2 } from 'lucide-react';
import { APP_NAME } from '@/constants/config';

/** Pantalla de carga inicial mientras se abre/siembra la base de datos. */
export function AppSplash() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="flex items-center gap-3">
        <img src="/favicon.svg" alt="" className="h-10 w-10" aria-hidden />
        <span className="text-2xl font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Cargando tus datos…</span>
      </div>
    </div>
  );
}
