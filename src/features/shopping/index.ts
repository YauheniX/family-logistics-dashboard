/**
 * Shopping feature exports
 * Provides a clean API for the shopping feature
 */

// Domain
export * from './domain/shopping.service';

// Infrastructure (repositories - now via factory)
export * from './infrastructure/shopping.factory';

// Presentation
export * from './presentation/shopping.store';
