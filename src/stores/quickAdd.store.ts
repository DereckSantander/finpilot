import { create } from 'zustand';

/**
 * Estado de UI efímero para el diálogo de gasto rápido (ADR-0010). No persiste:
 * solo controla la apertura del diálogo desde cualquier parte de la app.
 */
interface QuickAddState {
  open: boolean;
  setOpen: (open: boolean) => void;
  openQuickAdd: () => void;
}

export const useQuickAddStore = create<QuickAddState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  openQuickAdd: () => set({ open: true }),
}));
