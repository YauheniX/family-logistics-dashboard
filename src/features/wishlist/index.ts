/**
 * Wishlist feature exports
 * Provides a clean API for the wishlist feature
 */

// Domain
export * from './domain/wishlist.service';

// Infrastructure (repositories - now via factory)
export * from './infrastructure/wishlist.factory';

// Presentation
export * from './presentation/wishlist.store';
