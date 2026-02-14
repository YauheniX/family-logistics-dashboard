/**
 * Validation utilities for forms
 */

export const MIN_PASSWORD_LENGTH = 6;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
