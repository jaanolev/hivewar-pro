import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { trackEvent, Events } from '../utils/analytics';

// Set when a user kicks off Discord/Google auth, read after the OAuth
// redirect lands back on the app so we count exactly one registration per
// completed sign-in (returning users never have this flag set).
const PENDING_AUTH_KEY = 'hivewar_pending_auth';

function trackRegistrationIfPending(session: Session | null) {
  const user = session?.user;
  if (!user || user.is_anonymous) return;
  const provider = sessionStorage.getItem(PENDING_AUTH_KEY);
  if (!provider) return;
  sessionStorage.removeItem(PENDING_AUTH_KEY);
  trackEvent(Events.SIGN_UP, { provider });
}

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
        trackRegistrationIfPending(existing);
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
      trackRegistrationIfPending(newSession);
      setSession(newSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const redirectTo = window.location.origin + window.location.pathname;
  const isAnonymous = session?.user?.is_anonymous ?? false;

  // If the user already has an anonymous session, link the new identity
  // to that user so their existing plans carry over. Otherwise (no session
  // or signed-out) do a fresh OAuth sign-in.
  async function authenticateWith(provider: 'discord' | 'google') {
    sessionStorage.setItem(PENDING_AUTH_KEY, provider);

    if (session && isAnonymous) {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo },
      });
      if (error) {
        sessionStorage.removeItem(PENDING_AUTH_KEY);
        console.error(`[auth] linkIdentity(${provider}) failed:`, error);
        throw error;
      }
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) {
      sessionStorage.removeItem(PENDING_AUTH_KEY);
      console.error(`[auth] signInWithOAuth(${provider}) failed:`, error);
      throw error;
    }
  }

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    isAnonymous,
    loading,
    signInWithDiscord: () => authenticateWith('discord'),
    signInWithGoogle: () => authenticateWith('google'),
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
