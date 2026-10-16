import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};
const supabaseUrl = (extra.supabaseUrl as string) || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey =
  (extra.supabaseAnonKey as string) || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;
