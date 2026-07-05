import {
  Bus,
  UtensilsCrossed,
  Smartphone,
  CreditCard,
  Heart,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  Plane,
  Ellipsis,
  Briefcase,
  Gift,
  PlusCircle,
  Home,
  Car,
  Coffee,
  Fuel,
  ShoppingCart,
  Wallet,
  PiggyBank,
  Landmark,
  GraduationCap,
  Dumbbell,
  Shirt,
  Wifi,
  Zap,
  Music,
  Film,
  BookOpen,
  Wrench,
  Dog,
  Tag,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catálogo de iconos para categorías (incluye los de las categorías semilla).
 * Se resuelve por nombre con fallback a `Tag`.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Bus,
  UtensilsCrossed,
  Smartphone,
  CreditCard,
  Heart,
  ShoppingBag,
  Gamepad2,
  HeartPulse,
  Plane,
  Ellipsis,
  Briefcase,
  Gift,
  PlusCircle,
  Home,
  Car,
  Coffee,
  Fuel,
  ShoppingCart,
  Wallet,
  PiggyBank,
  Landmark,
  GraduationCap,
  Dumbbell,
  Shirt,
  Wifi,
  Zap,
  Music,
  Film,
  BookOpen,
  Wrench,
  Dog,
  Tag,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

/** Resuelve el icono de una categoría por nombre (fallback: Tag). */
export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? Tag;
}
