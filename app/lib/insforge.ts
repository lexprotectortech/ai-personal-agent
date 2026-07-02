import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://9pqv2mn7.ap-southeast.insforge.app',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'anon_e882b4e2d611fb0b6a3be5f284b3f4e359f306444ccb8c39e227b1330c8c9e22'
});

/**
 * Creates a user-scoped InsForge client instance for server-side operations
 */
export function getInsForgeClient(userJwt?: string | null) {
  if (!userJwt) return insforge;
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://9pqv2mn7.ap-southeast.insforge.app',
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'anon_e882b4e2d611fb0b6a3be5f284b3f4e359f306444ccb8c39e227b1330c8c9e22',
    accessToken: userJwt
  });
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  const sdkHeaders = insforge.getHttpClient().getHeaders();
  if (sdkHeaders['Authorization']) {
    headers.set('Authorization', sdkHeaders['Authorization']);
  }
  return fetch(url, {
    ...options,
    headers
  });
}
