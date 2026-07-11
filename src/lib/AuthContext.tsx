import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }
      setProfile(data as UserProfile | null);
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }, []);

  useEffect(() => {
    // Skip auth on server (SSR)
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // Resolve the initial auth state exactly once, and ALWAYS clear the
    // loading gate afterwards. Supabase's auth lock can reject getSession()
    // with "AbortError: signal is aborted without reason" (or hang) on web;
    // without this guard isLoading would stay true and the app would spin
    // on the loading screen forever.
    let settled = false;
    const finish = (s: Session | null) => {
      if (settled) return;
      settled = true;
      setSession(s);
      if (s?.user) loadProfile(s.user.id);
      setIsLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => finish(s))
      .catch((err) => {
        console.error('getSession failed, continuing unauthenticated:', err);
        finish(null);
      });

    // Safety net: never let a hung/aborted getSession keep the app spinning.
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('getSession timed out; continuing unauthenticated');
        finish(null);
      }
    }, 3000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        if (s?.user) {
          await loadProfile(s.user.id);
        } else {
          setProfile(null);
        }
        // Any auth event means we now know the auth state — clear loading.
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/The586Dynasty_v2/`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/The586Dynasty_v2/auth/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
