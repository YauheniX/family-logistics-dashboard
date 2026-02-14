/**
 * Configuration for backend mode
 * Controls whether to use Supabase or mock backend
 */

/**
 * Check if we're in mock mode
 * Mock mode is enabled when:
 * 1. VITE_USE_MOCK_BACKEND is explicitly set to 'true'
 * 2. OR Supabase credentials are missing
 */
export function isMockMode(): boolean {
  const useMock = import.meta.env.VITE_USE_MOCK_BACKEND;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Explicit mock mode
  if (useMock === 'true') {
    return true;
  }

  // Auto-enable mock mode if Supabase credentials are missing
  if (!supabaseUrl || !supabaseKey) {
    console.info(
      '🔧 Running in MOCK MODE - Supabase credentials not found. Using localStorage for data persistence.',
    );
    return true;
  }

  return false;
}

/**
 * Get backend mode label for UI
 */
export function getBackendMode(): string {
  return isMockMode() ? 'Mock (LocalStorage)' : 'Supabase';
}
