/**
 * Shared utilities for path validation and normalization.
 * Used across auth service and OAuth redirect handling.
 */

/**
 * Validates that a path is safe for internal navigation.
 * Rejects absolute URLs, protocol-relative URLs, and dangerous protocols.
 */
export function isSafeInternalPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return false;
  // Disallow full URLs or protocol-relative URLs.
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) return false;
  if (trimmed.startsWith('//')) return false;
  // Avoid obvious JS/data/vbscript payloads.
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:')) return false;
  if (lower.startsWith('data:')) return false;
  if (lower.startsWith('vbscript:')) return false;
  return true;
}

/**
 * Normalizes a path for hash-based routing.
 * Ensures the path starts with '/' and removes hash prefix if present.
 */
export function normalizeHashPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (trimmed.startsWith('#')) {
    const withoutHash = trimmed.replace(/^#\/?/, '/');
    return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Safely extracts and normalizes a redirect path from a query parameter.
 * Handles both string and string[] values. Validates the path using isSafeInternalPath
 * and rejects unsafe values (absolute URLs, JS protocols, etc.) by falling back to defaultPath.
 */
export function normalizeRedirectParam(
  param: string | string[] | undefined,
  defaultPath = '/',
): string {
  let redirect = defaultPath;

  if (typeof param === 'string') {
    const trimmed = param.trim();
    if (trimmed && isSafeInternalPath(trimmed)) {
      redirect = trimmed;
    }
  } else if (Array.isArray(param) && typeof param[0] === 'string') {
    const trimmed = param[0].trim();
    if (trimmed && isSafeInternalPath(trimmed)) {
      redirect = trimmed;
    }
  }

  return redirect;
}
