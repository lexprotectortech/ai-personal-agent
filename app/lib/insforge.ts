import { createClient } from '@insforge/sdk';

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://9pqv2mn7.ap-southeast.insforge.app',
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'anon_e882b4e2d611fb0b6a3be5f284b3f4e359f306444ccb8c39e227b1330c8c9e22'
});
