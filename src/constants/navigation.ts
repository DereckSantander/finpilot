import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  CreditCard,
  Target,
  ShieldCheck,
  Wallet,
  BarChart3,
  Landmark,
  LineChart,
  Sparkles,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Coincidencia exacta de ruta (para el enlace del dashboard "/"). */
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: readonly NavItem[];
}

/** Navegación principal agrupada por secciones (ver architecture.md §6). */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    title: 'General',
    items: [{ label: 'Dashboard', path: ROUTES.dashboard, icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Movimientos',
    items: [
      { label: 'Ingresos', path: ROUTES.income, icon: TrendingUp },
      { label: 'Gastos', path: ROUTES.expenses, icon: Receipt },
      { label: 'Tarjetas', path: ROUTES.cards, icon: CreditCard },
    ],
  },
  {
    title: 'Planificación',
    items: [
      { label: 'Metas', path: ROUTES.goals, icon: Target },
      { label: 'Fondo de emergencia', path: ROUTES.emergencyFund, icon: ShieldCheck },
      { label: 'Presupuesto', path: ROUTES.budget, icon: Wallet },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { label: 'Estadísticas', path: ROUTES.statistics, icon: BarChart3 },
      { label: 'Pólizas', path: ROUTES.deposits, icon: Landmark },
      { label: 'Proyecciones', path: ROUTES.projections, icon: LineChart },
      { label: 'Inteligencia', path: ROUTES.insights, icon: Sparkles },
    ],
  },
  {
    title: 'Sistema',
    items: [{ label: 'Configuración', path: ROUTES.settings, icon: Settings }],
  },
];
