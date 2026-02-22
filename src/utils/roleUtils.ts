/**
 * Role Utilities
 *
 * Centralized role-related constants and functions to ensure consistency
 * across the application.
 */

import type { MemberRole } from '@/features/shared/domain/entities';

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  child: 'Child',
  viewer: 'Viewer',
};

export const ROLE_ICONS: Record<MemberRole, string> = {
  owner: '👑',
  admin: '⭐',
  member: '👤',
  child: '👶',
  viewer: '👀',
};

export const ROLE_STYLES = {
  badge: {
    owner: 'bg-yellow-500 dark:bg-yellow-600',
    admin: 'bg-blue-500 dark:bg-blue-600',
    member: 'bg-blue-500 dark:bg-blue-600',
    child: 'bg-green-500 dark:bg-green-600',
    viewer: 'bg-purple-500 dark:bg-purple-600',
  },
  border: {
    owner: 'border-yellow-400 dark:border-yellow-500',
    admin: 'border-neutral-300 dark:border-neutral-600',
    member: 'border-neutral-300 dark:border-neutral-600',
    child: 'border-green-300 dark:border-green-600',
    viewer: 'border-purple-300 dark:border-purple-600',
  },
} as const satisfies Record<'badge' | 'border', Record<MemberRole, string>>;

/**
 * Get the display label for a role
 */
export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role as MemberRole] || 'Member';
}

/**
 * Get the emoji icon for a role
 */
export function getRoleIcon(role: string): string {
  return ROLE_ICONS[role as MemberRole] || '👤';
}

/**
 * Get the badge background class for a role
 */
export function getRoleBadgeClass(role: string): string {
  return ROLE_STYLES.badge[role as MemberRole] || ROLE_STYLES.badge.member;
}

/**
 * Get the border class for a role
 */
export function getRoleBorderClass(role: string): string {
  return ROLE_STYLES.border[role as MemberRole] || ROLE_STYLES.border.member;
}
