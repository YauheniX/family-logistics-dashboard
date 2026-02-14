/**
 * Auth service factory - creates appropriate service based on backend mode
 */

import { isMockMode } from '@/config/backend.config';
import { AuthService } from '../domain/auth.service';
import { MockAuthService } from '../domain/auth.service.mock';

/**
 * Get auth service (real or mock based on config)
 */
export function getAuthService() {
  return isMockMode() ? new MockAuthService() : new AuthService();
}

// Singleton instance (will be real or mock based on mode)
export const authService = getAuthService();
