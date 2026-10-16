import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

export const oauthRedirectTo = makeRedirectUri({
  scheme: 'mindstream',
  path: 'auth/callback',
});

export async function createSessionFromUrl(url: string) {
  if (!supabase) throw new Error('Auth not configured');

  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (error) throw error;
  return data.session;
}

export async function signInWithOAuth(provider: Provider) {
  if (!supabase) throw new Error('Auth not configured');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: oauthRedirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectTo);
  if (result.type === 'success') {
    await createSessionFromUrl(result.url);
    return;
  }
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Sign in cancelled');
  }
}
