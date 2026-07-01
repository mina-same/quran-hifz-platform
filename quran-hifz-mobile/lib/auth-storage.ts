import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'qh_token';

// SecureStore reads are async, unlike web's synchronous localStorage — there's no
// way to seed state before first paint, so callers must show a loading state
// until getToken() resolves. No separate cached-user store: /auth/me is always
// called on hydrate to validate the token, so caching the user client-side buys
// nothing extra here (unlike web, where it avoids a flash of unauthenticated UI).

export function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export function setToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(TOKEN_KEY, token);
}

export function clearToken(): Promise<void> {
  return SecureStore.deleteItemAsync(TOKEN_KEY);
}
