/**
 * Repository factory - creates appropriate repository based on backend mode
 */

import { isMockMode } from '@/config/backend.config';

// Real repositories
import { HouseholdRepository, MemberRepository } from './household.repository';

// Mock repositories
import { MockHouseholdRepository, MockMemberRepository } from './household.mock-repository';

/**
 * Get household repository (real or mock based on config)
 */
export function getHouseholdRepository() {
  return isMockMode() ? new MockHouseholdRepository() : new HouseholdRepository();
}

/**
 * Get household member repository (real or mock based on config)
 */
export function getMemberRepository() {
  return isMockMode() ? new MockMemberRepository() : new MemberRepository();
}

// Singleton instances (will be real or mock based on mode)
export const householdRepository = getHouseholdRepository();
export const memberRepository = getMemberRepository();
