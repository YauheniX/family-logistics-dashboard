/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { HouseholdRepository, MemberRepository } from './household.repository';

// Mock repositories
import { MockHouseholdRepository, MockMemberRepository } from './household.mock-repository';

/**
 * Get household member repository (real or mock based on config)
 */
export function getMemberRepository() {
  return isMockMode() ? new MockMemberRepository() : new MemberRepository();
}

/**
 * Get household repository (real or mock based on config)
 */
export function getHouseholdRepository() {
  if (isMockMode()) {
    // Pass member repository to maintain consistent mock state
    return new MockHouseholdRepository(memberRepository as MockMemberRepository);
  }
  return new HouseholdRepository();
}

// Singleton instances (will be real or mock based on mode)
// Note: memberRepository must be created first for mock mode
export const memberRepository = getMemberRepository();
export const householdRepository = getHouseholdRepository();
