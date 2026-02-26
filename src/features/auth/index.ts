/**
 * Auth feature exports
 */

// Domain
export { authService as authServiceReal } from './domain/auth.service';
export type { AuthService, AuthUser } from './domain/auth.service';
export * from './domain/auth.service.mock';

// Factory (default export)
export { authService } from './domain/auth-service.factory';
