/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { FamilyRepository, FamilyMemberRepository } from './family.repository';

// Mock repositories
import { MockFamilyRepository, MockFamilyMemberRepository } from './family.mock-repository';

/**
 * Get family repository (real or mock based on config)
 */
export function getFamilyRepository() {
  return isMockMode() ? new MockFamilyRepository() : new FamilyRepository();
}

/**
 * Get family member repository (real or mock based on config)
 */
export function getFamilyMemberRepository() {
  return isMockMode() ? new MockFamilyMemberRepository() : new FamilyMemberRepository();
}

// Singleton instances (will be real or mock based on mode)
export const familyRepository = getFamilyRepository();
export const familyMemberRepository = getFamilyMemberRepository();
