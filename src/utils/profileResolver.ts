/**
 * Profile Resolution Utilities
 *
 * Provides consistent fallback logic for user names and avatars across the app.
 * This ensures Google OAuth data doesn't override local profile updates.
 *
 * Priority:
 * - Name: local profile name → Google name → email prefix
 * - Avatar: uploaded avatar → Google avatar → default avatar
 */

import type { AuthUser } from '@/features/auth';
import type { Member } from '@/features/shared/domain/entities';

export interface UserProfileInput {
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface ResolvedProfile {
  name: string;
  avatar: string | null;
}

/**
 * Extract email prefix (part before @)
 */
function getEmailPrefix(email?: string | null): string {
  if (!email) return 'User';
  const prefix = email.split('@')[0];
  return prefix || 'User';
}

/**
 * Resolve user profile with consistent fallback logic
 *
 * @param profile - User profile from user_profiles table
 * @param authUser - Auth user with OAuth metadata
 * @param email - User's email (fallback for name)
 * @returns Resolved profile with name and avatar
 *
 * @example
 * ```typescript
 * const resolved = resolveUserProfile(
 *   { display_name: 'John Doe', avatar_url: '/uploads/avatar.jpg' },
 *   authUser,
 *   'john@example.com'
 * );
 * // resolved.name = 'John Doe' (local profile takes priority)
 * // resolved.avatar = '/uploads/avatar.jpg'
 * ```
 */
export function resolveUserProfile(
  profile?: UserProfileInput | null,
  authUser?: AuthUser | null,
  email?: string | null,
): ResolvedProfile {
  const googleName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name;
  const name = profile?.display_name || googleName || getEmailPrefix(email || authUser?.email);

  const googleAvatar = authUser?.user_metadata?.avatar_url;
  const localAvatar = profile?.avatar_url;
  const avatar = isValidAvatarUrl(localAvatar) ? localAvatar! : googleAvatar || null;

  return {
    name, // getEmailPrefix already guarantees non-empty string
    avatar,
  };
}

/**
 * Resolve member profile with consistent fallback logic
 * Used for household members displayed in lists and cards
 *
 * @param member - Member from members table
 * @returns Resolved profile with name and avatar
 *
 * @example
 * ```typescript
 * const resolved = resolveMemberProfile(member);
 * // resolved.name = member.display_name || member.email || 'Unknown Member'
 * // resolved.avatar = member.avatar_url || null
 * ```
 */
export function resolveMemberProfile(member: Member): ResolvedProfile {
  // Name fallback: member name → user_profiles name (Google OAuth) → email → default
  const profileName = member.user_profiles?.display_name;
  const name = profileName || member.display_name || member.email || 'Unknown Member';

  // Avatar fallback: member avatar_url → user_profiles avatar (from Google) → null
  const localAvatar = member.avatar_url;
  const profileAvatar = member.user_profiles?.avatar_url;
  const avatar = isValidAvatarUrl(localAvatar) ? localAvatar! : profileAvatar || null;

  return { name, avatar };
}

/**
 * Get initials from a name for avatar display
 *
 * @param name - Full name or display name
 * @returns Initials (max 2 characters, uppercase)
 *
 * @example
 * ```typescript
 * getInitials('John Doe') // 'JD'
 * getInitials('Alice') // 'A'
 * getInitials('') // 'U'
 * ```
 */
export function getInitials(name?: string | null): string {
  if (!name || name.trim() === '') return 'U';

  const trimmed = name.trim();
  const words = trimmed.split(/\s+/);

  if (words.length === 1) {
    // Single word: take first letter
    return words[0][0].toUpperCase();
  }

  // Multiple words: take first letter of first two words
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Check if an avatar URL is present (not empty or whitespace-only)
 * Note: This only checks for a non-empty string, not URL format validity
 */
export function isValidAvatarUrl(url?: string | null): boolean {
  return Boolean(url && url.trim() !== '');
}
