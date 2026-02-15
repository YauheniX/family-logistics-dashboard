import { supabase } from '@/features/shared/infrastructure/supabase.client';
import { isMockMode } from '@/config/backend.config';
import { isSafeInternalPath, normalizeHashPath } from './pathValidation';

function parseHashParams(hash: string): URLSearchParams {
  // Supports both '#access_token=...' and '#/access_token=...'
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

function cleanToHomeHash(): void {
  // Hash-router expects '#/...' – cleaning prevents Vue Router from trying to resolve
  // '/access_token=...' as a path and avoids leaking tokens via copy/paste.
  const next = `${window.location.pathname}${window.location.search}#/`;
  window.history.replaceState({}, document.title, next);
}

function getAndClearPostAuthRedirect(): string | null {
  try {
    const value = window.sessionStorage.getItem('postAuthRedirect');
    if (value) {
      window.sessionStorage.removeItem('postAuthRedirect');
      return value;
    }
  } catch {
    // ignore
  }
  return null;
}

function cleanToRedirectHash(targetHashPath: string): void {
  const safe = normalizeHashPath(targetHashPath);
  const next = `${window.location.pathname}${window.location.search}#${safe.startsWith('/') ? '/' : ''}${safe}`;
  // If safe is '/x', we want '#/x'
  const fixed = next.replace(/#\/+/, '#/');
  window.history.replaceState({}, document.title, fixed);
}

/**
 * Handles Supabase OAuth redirects in SPAs using hash routing.
 *
 * Why needed:
 * - Supabase implicit flow returns tokens in URL hash (sometimes '#/access_token=...' depending on redirect URL).
 * - Vue Router hash history will interpret that as a route and show a blank page.
 */
export async function handleSupabaseAuthRedirect(): Promise<void> {
  if (isMockMode()) return;

  // PKCE flow (preferred): ?code=...
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      url.searchParams.delete('code');
      const postAuth = getAndClearPostAuthRedirect();
      if (postAuth && isSafeInternalPath(postAuth)) {
        const next = `${url.pathname}${url.search}#${normalizeHashPath(postAuth)}`.replace(
          /#\/+/,
          '#/',
        );
        window.history.replaceState({}, document.title, next);
      } else {
        const next = `${url.pathname}${url.search}#/`;
        window.history.replaceState({}, document.title, next);
      }
      return;
    }
  } catch {
    // ignore
  }

  // Implicit flow: #access_token=... or #/access_token=...
  try {
    if (!window.location.hash) return;
    const params = parseHashParams(window.location.hash);
    if (!hasAnyAuthParams(params)) return;

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    // If tokens are present, set session explicitly (more reliable than hoping router won't choke).
    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }

    // Always clean URL if we detected auth params.
    const postAuth = getAndClearPostAuthRedirect();
    if (postAuth && isSafeInternalPath(postAuth)) {
      cleanToRedirectHash(postAuth);
    } else {
      cleanToHomeHash();
    }
  } catch {
    // ignore
  }
}
