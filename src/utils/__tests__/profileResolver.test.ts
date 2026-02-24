import { describe, it, expect } from 'vitest';
import {
  resolveUserProfile,
  resolveMemberProfile,
  getInitials,
  isValidAvatarUrl,
  type UserProfileInput,
} from '../profileResolver';
import type { AuthUser } from '@/features/auth';
import type { Member } from '@/features/shared/domain/entities';

describe('profileResolver', () => {
  describe('resolveUserProfile', () => {
    it('prioritizes local profile name over Google name', () => {
      const profile: UserProfileInput = {
        display_name: 'Local Name',
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Google Name',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.name).toBe('Local Name');
    });

    it('falls back to Google name when local profile name is empty', () => {
      const profile: UserProfileInput = {
        display_name: null,
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Google Name',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.name).toBe('Google Name');
    });

    it('falls back to email prefix when both profile and Google name are empty', () => {
      const profile: UserProfileInput = {
        display_name: null,
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'testuser@example.com',
        user_metadata: {},
      };

      const result = resolveUserProfile(profile, authUser, 'testuser@example.com');

      expect(result.name).toBe('testuser');
    });

    it('uses email from parameter when authUser email is unavailable', () => {
      const profile: UserProfileInput = {
        display_name: null,
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: '',
        user_metadata: {},
      };

      const result = resolveUserProfile(profile, authUser, 'john@example.com');

      expect(result.name).toBe('john');
    });

    it('returns "User" as ultimate fallback for name', () => {
      const result = resolveUserProfile(null, null, null);

      expect(result.name).toBe('User');
    });

    it('prioritizes local profile avatar over Google avatar', () => {
      const profile: UserProfileInput = {
        display_name: 'Test User',
        avatar_url: '/uploads/avatar.jpg',
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          avatar_url: 'https://google.com/avatar.jpg',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.avatar).toBe('/uploads/avatar.jpg');
    });

    it('respects explicitly cleared avatar (null) without falling back', () => {
      const profile: UserProfileInput = {
        display_name: 'Test User',
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          avatar_url: 'https://google.com/avatar.jpg',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.avatar).toBeNull();
    });

    it('falls back to Google avatar when local avatar is undefined', () => {
      const profile: UserProfileInput = {
        display_name: 'Test User',
        avatar_url: undefined,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          avatar_url: 'https://google.com/avatar.jpg',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.avatar).toBe('https://google.com/avatar.jpg');
    });

    it('returns null avatar when both sources are empty', () => {
      const profile: UserProfileInput = {
        display_name: 'Test User',
        avatar_url: null,
      };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {},
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.avatar).toBeNull();
    });

    it('handles missing profile gracefully', () => {
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Google User',
          avatar_url: 'https://google.com/avatar.jpg',
        },
      };

      const result = resolveUserProfile(null, authUser, 'test@example.com');

      expect(result.name).toBe('Google User');
      expect(result.avatar).toBe('https://google.com/avatar.jpg');
    });

    it('handles missing authUser gracefully', () => {
      const profile: UserProfileInput = {
        display_name: 'Local User',
        avatar_url: '/avatar.jpg',
      };

      const result = resolveUserProfile(profile, null, 'test@example.com');

      expect(result.name).toBe('Local User');
      expect(result.avatar).toBe('/avatar.jpg');
    });

    it('prefers user_metadata.full_name over user_metadata.name', () => {
      const profile: UserProfileInput = { display_name: null, avatar_url: null };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Full Name',
          name: 'Short Name',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.name).toBe('Full Name');
    });

    it('falls back to user_metadata.name if full_name is missing', () => {
      const profile: UserProfileInput = { display_name: null, avatar_url: null };
      const authUser: AuthUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: {
          name: 'Short Name',
        },
      };

      const result = resolveUserProfile(profile, authUser, 'test@example.com');

      expect(result.name).toBe('Short Name');
    });
  });

  describe('resolveMemberProfile', () => {
    it('uses member display_name when available', () => {
      const member: Member = {
        id: '1',
        household_id: 'h1',
        user_id: 'u1',
        role: 'member',
        display_name: 'John Doe',
        date_of_birth: null,
        avatar_url: '/avatar.jpg',
        is_active: true,
        joined_at: new Date().toISOString(),
        invited_by: null,
        metadata: {},
        email: 'john@example.com',
      };

      const result = resolveMemberProfile(member);

      expect(result.name).toBe('John Doe');
      expect(result.avatar).toBe('/avatar.jpg');
    });

    it('falls back to email when display_name is empty', () => {
      const member: Member = {
        id: '1',
        household_id: 'h1',
        user_id: 'u1',
        role: 'member',
        display_name: '',
        date_of_birth: null,
        avatar_url: null,
        is_active: true,
        joined_at: new Date().toISOString(),
        invited_by: null,
        metadata: {},
        email: 'john@example.com',
      };

      const result = resolveMemberProfile(member);

      expect(result.name).toBe('john@example.com');
    });

    it('returns "Unknown Member" when both display_name and email are empty', () => {
      const member: Member = {
        id: '1',
        household_id: 'h1',
        user_id: null,
        role: 'child',
        display_name: '',
        date_of_birth: '2015-05-20',
        avatar_url: null,
        is_active: true,
        joined_at: new Date().toISOString(),
        invited_by: 'parent1',
        metadata: {},
      };

      const result = resolveMemberProfile(member);

      expect(result.name).toBe('Unknown Member');
    });

    it('returns null avatar when member has no avatar', () => {
      const member: Member = {
        id: '1',
        household_id: 'h1',
        user_id: 'u1',
        role: 'member',
        display_name: 'Jane Doe',
        date_of_birth: null,
        avatar_url: null,
        is_active: true,
        joined_at: new Date().toISOString(),
        invited_by: null,
        metadata: {},
      };

      const result = resolveMemberProfile(member);

      expect(result.avatar).toBeNull();
    });
  });

  describe('getInitials', () => {
    it('returns first letter of single word', () => {
      expect(getInitials('Alice')).toBe('A');
    });

    it('returns first letter of two words', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('returns first letter of first two words when more than two', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('handles extra whitespace', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('returns "U" for empty string', () => {
      expect(getInitials('')).toBe('U');
    });

    it('returns "U" for null', () => {
      expect(getInitials(null)).toBe('U');
    });

    it('returns "U" for undefined', () => {
      expect(getInitials(undefined)).toBe('U');
    });

    it('returns uppercase initials', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('handles names with special characters', () => {
      expect(getInitials('Jean-Pierre Dupont')).toBe('JD');
    });
  });

  describe('isValidAvatarUrl', () => {
    it('returns true for valid URL', () => {
      expect(isValidAvatarUrl('/avatar.jpg')).toBe(true);
      expect(isValidAvatarUrl('https://example.com/avatar.jpg')).toBe(true);
    });

    it('returns false for empty string', () => {
      expect(isValidAvatarUrl('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
      expect(isValidAvatarUrl('   ')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isValidAvatarUrl(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isValidAvatarUrl(undefined)).toBe(false);
    });
  });
});
