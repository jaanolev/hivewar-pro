import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAnonymous: boolean;
  loading: boolean;
  signInWithDiscord: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const {
        data: { session: existing },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (existing) {
        setSession(existing);
        setLoading(false);
        return;
      }

      // No session yet — sign in anonymously so the user gets a real
      // auth.users row and their plans can be persisted to the cloud.
      // They can upgrade to Discord/Google later without losing data.
      const { data, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;

      if (error) {
        console.error('[auth] anonymous sign-in failed:', error);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setLoading(false);
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const redirectTo = window.location.origin + window.location.pathname;

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    isAnonymous: session?.user?.is_anonymous ?? false,
    loading,
    signInWithDiscord: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo },
      });
    },
    signInWithGoogle: async () => {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
