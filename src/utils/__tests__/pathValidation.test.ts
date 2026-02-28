import { describe, it, expect } from 'vitest';
import { isSafeInternalPath, normalizeHashPath, normalizeRedirectParam } from '../pathValidation';

describe('pathValidation', () => {
  describe('isSafeInternalPath', () => {
    it('should return false for empty string', () => {
      expect(isSafeInternalPath('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isSafeInternalPath('   ')).toBe(false);
    });

    it('should return true for valid internal path', () => {
      expect(isSafeInternalPath('/dashboard')).toBe(true);
      expect(isSafeInternalPath('/shopping/lists')).toBe(true);
      expect(isSafeInternalPath('home')).toBe(true);
    });

    it('should reject absolute URLs with protocols', () => {
      expect(isSafeInternalPath('http://example.com')).toBe(false);
      expect(isSafeInternalPath('https://example.com')).toBe(false);
      expect(isSafeInternalPath('ftp://example.com')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isSafeInternalPath('//example.com')).toBe(false);
      expect(isSafeInternalPath('//evil.com/path')).toBe(false);
    });

    it('should reject javascript: protocol', () => {
      expect(isSafeInternalPath('javascript:alert(1)')).toBe(false);
      expect(isSafeInternalPath('JavaScript:alert(1)')).toBe(false);
      expect(isSafeInternalPath('JAVASCRIPT:alert(1)')).toBe(false);
    });

    it('should reject data: protocol', () => {
      expect(isSafeInternalPath('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isSafeInternalPath('Data:text/html')).toBe(false);
    });

    it('should reject vbscript: protocol', () => {
      expect(isSafeInternalPath('vbscript:msgbox(1)')).toBe(false);
      expect(isSafeInternalPath('VBScript:msgbox(1)')).toBe(false);
    });

    it('should accept paths with query strings and hashes', () => {
      expect(isSafeInternalPath('/path?query=value')).toBe(true);
      expect(isSafeInternalPath('/path#anchor')).toBe(true);
    });
  });

  describe('normalizeHashPath', () => {
    it('should return "/" for empty string', () => {
      expect(normalizeHashPath('')).toBe('/');
    });

    it('should return "/" for whitespace-only string', () => {
      expect(normalizeHashPath('   ')).toBe('/');
    });

    it('should preserve path that starts with /', () => {
      expect(normalizeHashPath('/dashboard')).toBe('/dashboard');
      expect(normalizeHashPath('/shopping/lists')).toBe('/shopping/lists');
    });

    it('should add leading slash to path without it', () => {
      expect(normalizeHashPath('dashboard')).toBe('/dashboard');
      expect(normalizeHashPath('home')).toBe('/home');
    });

    it('should remove hash prefix and ensure leading slash', () => {
      expect(normalizeHashPath('#/dashboard')).toBe('/dashboard');
      expect(normalizeHashPath('#dashboard')).toBe('/dashboard');
    });

    it('should handle paths with query strings', () => {
      expect(normalizeHashPath('#/path?query=value')).toBe('/path?query=value');
      expect(normalizeHashPath('path?query=value')).toBe('/path?query=value');
    });
  });

  describe('normalizeRedirectParam', () => {
    it('should return default path for undefined param', () => {
      expect(normalizeRedirectParam(undefined)).toBe('/');
      expect(normalizeRedirectParam(undefined, '/home')).toBe('/home');
    });

    it('should return default path for empty string', () => {
      expect(normalizeRedirectParam('')).toBe('/');
      expect(normalizeRedirectParam('', '/home')).toBe('/home');
    });

    it('should return default path for whitespace-only string', () => {
      expect(normalizeRedirectParam('   ')).toBe('/');
    });

    it('should return valid internal path', () => {
      expect(normalizeRedirectParam('/dashboard')).toBe('/dashboard');
      expect(normalizeRedirectParam('home')).toBe('home');
    });

    it('should reject unsafe paths and return default', () => {
      expect(normalizeRedirectParam('http://evil.com')).toBe('/');
      expect(normalizeRedirectParam('javascript:alert(1)')).toBe('/');
      expect(normalizeRedirectParam('//evil.com')).toBe('/');
      expect(normalizeRedirectParam('data:text/html')).toBe('/');
    });

    it('should handle array parameter with single value', () => {
      expect(normalizeRedirectParam(['/dashboard'])).toBe('/dashboard');
      expect(normalizeRedirectParam(['home'])).toBe('home');
    });

    it('should handle array parameter with multiple values (use first)', () => {
      expect(normalizeRedirectParam(['/first', '/second'])).toBe('/first');
    });

    it('should reject unsafe array values', () => {
      expect(normalizeRedirectParam(['http://evil.com'])).toBe('/');
      expect(normalizeRedirectParam(['javascript:alert(1)'])).toBe('/');
    });

    it('should handle empty array', () => {
      expect(normalizeRedirectParam([])).toBe('/');
    });

    it('should handle array with empty string', () => {
      expect(normalizeRedirectParam([''])).toBe('/');
    });

    it('should use custom default path', () => {
      expect(normalizeRedirectParam(undefined, '/custom')).toBe('/custom');
      expect(normalizeRedirectParam('javascript:alert(1)', '/custom')).toBe('/custom');
    });
  });
});
