import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE = (extra.apiUrl as string) || process.env.EXPO_PUBLIC_API_URL || '';

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}
