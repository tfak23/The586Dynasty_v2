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

// On web, Supabase's auth client defaults to the Navigator LockManager
// (navigator.locks) to serialize token access. In this single-page app that
// lock intermittently aborts with "AbortError: signal is aborted without
// reason", which breaks BOTH getSession() (app can't restore a session) AND
// detectSessionInUrl() (OAuth/Google redirects never get processed, so the
// user lands back on the login screen with the token stuck in the URL).
// Replace it with a no-op lock — this app runs in a single tab and doesn't
// need cross-tab lock coordination.
const noopLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> => fn();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: typeof window !== 'undefined',
    detectSessionInUrl: Platform.OS === 'web',
    lock: noopLock,
  },
});
