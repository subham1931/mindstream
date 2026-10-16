import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Linking from 'expo-linking';
import type { Provider } from '@supabase/supabase-js';
import { createSessionFromUrl, signInWithOAuth as performOAuth } from '../auth/oauth';
import { supabase } from '../supabase';

type AuthContextValue = {
  user: { id: string; email?: string; user_metadata?: { full_name?: string } } | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const handleDeepLink = (url: string) => {
      createSessionFromUrl(url).catch(() => {});
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) throw new Error('Auth not configured');
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) throw new Error('Auth not configured');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithOAuth = async (provider: Provider) => {
    await performOAuth(provider);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const getAccessToken = async () => {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signInWithOAuth, signOut, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
