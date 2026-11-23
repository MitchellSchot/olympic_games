import { createContext } from 'react';
import type { Act1Data } from './data';

// Keep identity stable when the provider and hooks refresh independently.
export const Act1DataContext = createContext<Act1Data | null>(null);