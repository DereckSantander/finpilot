import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '@/constants/navigation';
import { APP_NAME, APP_TAGLINE } from '@/constants/config';
import { cn } from '@/lib/cn';

interface SidebarNavProps {
  /** Se invoca al navegar (para cerrar el panel móvil). */
  onNavigate?: () => void;
}

/** Contenido de navegación reutilizado por el sidebar de escritorio y el móvil. */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/favicon.svg" alt="" className="h-9 w-9" aria-hidden />
        <div className="leading-tight">
          <p className="text-base font-semibold tracking-tight text-sidebar-foreground">
            {APP_NAME}
          </p>
          <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? false}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-primary'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}

/** Sidebar fijo de escritorio. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
      <SidebarNav />
    </aside>
  );
}
