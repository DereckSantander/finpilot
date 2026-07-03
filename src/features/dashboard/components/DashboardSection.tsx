import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface DashboardSectionProps {
  title: string;
  icon?: ReactNode;
  to?: string;
  actionLabel?: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

/** Contenedor estándar de un widget del dashboard (título + enlace + contenido). */
export function DashboardSection({
  title,
  icon,
  to,
  actionLabel = 'Ver todo',
  className,
  contentClassName,
  children,
}: DashboardSectionProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {to ? (
          <Link
            to={to}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </CardHeader>
      <CardContent className={cn('flex-1', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
