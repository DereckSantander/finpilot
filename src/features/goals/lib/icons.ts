import {
  Target,
  Car,
  Plane,
  Home,
  Smartphone,
  Laptop,
  GraduationCap,
  Gift,
  PiggyBank,
  Heart,
  ShieldCheck,
  Landmark,
  type LucideIcon,
} from 'lucide-react';

/** Catálogo de iconos disponibles para las metas (por nombre). */
export const GOAL_ICONS: Record<string, LucideIcon> = {
  Target,
  Car,
  Plane,
  Home,
  Smartphone,
  Laptop,
  GraduationCap,
  Gift,
  PiggyBank,
  Heart,
  ShieldCheck,
  Landmark,
};

export const GOAL_ICON_NAMES = Object.keys(GOAL_ICONS);

/** Resuelve el icono de una meta por nombre (fallback: Target). */
export function goalIcon(name: string): LucideIcon {
  return GOAL_ICONS[name] ?? Target;
}
