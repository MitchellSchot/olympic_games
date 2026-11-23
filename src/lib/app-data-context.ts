import { createContext } from 'react';
import type { AppData } from './data';

// Keep context identity outside the refreshable provider/hooks module.
// Live updates must never leave mounted consumers reading a different context.
export const AppDataContext = createContext<AppData | null>(null);