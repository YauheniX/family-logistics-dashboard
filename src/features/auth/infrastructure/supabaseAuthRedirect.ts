import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { isMockMode } from '@/config/backend.config';

function parseHashParams(hash: string): URLSearchParams {
  const cleaned = hash.replace(/^#\/?/, '');
  return new URLSearchParams(cleaned);
}

function hasAnyAuthParams(params: URLSearchParams): boolean {
  return (
    params.has('access_token') ||
    params.has('refresh_token') ||
    params.has('error') ||
    params.has('error_description')
  );
}

function cleanUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.hash = '';
  window.history.replaceState({}, document.title, url.pathname + url.search);
}

/**
 * Handles Supabase OAuth redirects.
 *
 * - PKCE flow: exchanges `?code=...` for a session.
 * - Implicit flow: reads tokens from the URL hash (`#access_token=...`)
 *   and sets the session explicitly.
 *
 * After processing, the URL is cleaned so tokens are never visible.
 * A post-auth redirect stored in sessionStorage is left for `main.ts`
 * to consume via `router.replace()`.
 */
export async function handleSupabaseAuthRedirect(): Promise<void> {
  if (isMockMode()) return;

  // PKCE flow (preferred): ?code=...
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      cleanUrl();
      return;
    }
  } catch {
    // Code exchange failed – remove any partially-written session so the app
    // does not get stuck on a corrupted auth state that only a cache-clear
    // would fix (see: white-screen-on-mobile issue).
    try {
      await supabase.auth.signOut();
    } catch {
      // best-effort cleanup
    }
  }

  // Implicit flow: #access_token=...
  try {
    if (!window.location.hash) return;
    const params = parseHashParams(window.location.hash);
    if (!hasAnyAuthParams(params)) return;

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    // If tokens are present, set session explicitly.
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    // Clean URL so tokens are never visible.
    cleanUrl();
  } catch {
    // Session set failed – clean up corrupted state so subsequent loads
    // can start fresh rather than rendering a white screen.
    try {
      await supabase.auth.signOut();
    } catch {
      // best-effort cleanup
    }
    cleanUrl();
  }
}
