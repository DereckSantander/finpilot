import { createContext } from 'react';
import type { SettingsRow } from '@/db/schema';

export interface SettingsContextValue {
  settings: SettingsRow;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);
