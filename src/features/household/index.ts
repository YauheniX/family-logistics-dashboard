/**
 * Household feature exports
 * Provides a clean API for the household feature
 */

// Domain
export * from './domain/household.service';

// Infrastructure (repositories - now via factory)
export * from './infrastructure/household.factory';

// Presentation
export * from './presentation/household.store';
