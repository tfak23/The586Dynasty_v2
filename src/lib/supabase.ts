import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';
import { Platform } from 'react-native';

// Use a no-op storage during SSR (server-side static rendering)
const noopStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

function getStorage() {
  if (typeof window === 'undefined') return noopStorage;
  if (Platform.OS === 'web') return undefined; // use default localStorage
  // Native: use AsyncStorage
  return require('@react-native-async-storage/async-storage').default;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: Platform.OS === 'web',
  },
});
