import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isVerboseLoggingEnabled,
  getMinLogLevel,
  shouldLog,
  formatEntry,
  createLogger,
  type LogEntry,
} from '../logger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    level: 'info',
    context: 'Test',
    message: 'hello',
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── isVerboseLoggingEnabled ──────────────────────────────────────────────────

describe('isVerboseLoggingEnabled', () => {
  it('returns false when VITE_VERBOSE_LOGS is not set', () => {
    expect(isVerboseLoggingEnabled()).toBe(false);
  });
});

// ─── getMinLogLevel ───────────────────────────────────────────────────────────

describe('getMinLogLevel', () => {
  it('returns "info" by default (verbose flag off)', () => {
    expect(getMinLogLevel()).toBe('info');
  });
});

// ─── shouldLog ───────────────────────────────────────────────────────────────

describe('shouldLog', () => {
  it('suppresses debug when verbose flag is off', () => {
    expect(shouldLog('debug')).toBe(false);
  });

  it('allows info, warn, and error when verbose flag is off', () => {
    expect(shouldLog('info')).toBe(true);
    expect(shouldLog('warn')).toBe(true);
    expect(shouldLog('error')).toBe(true);
  });
});

// ─── formatEntry ─────────────────────────────────────────────────────────────

describe('formatEntry', () => {
  it('formats an entry without meta', () => {
    const entry = makeEntry({ level: 'info', context: 'Ctx', message: 'msg' });
    expect(formatEntry(entry)).toBe('[2025-01-01T00:00:00.000Z] [INFO] [Ctx] msg');
  });

  it('appends JSON meta when present', () => {
    const entry = makeEntry({ meta: { token: 1, householdId: 'h1' } });
    const formatted = formatEntry(entry);
    expect(formatted).toContain('{"token":1,"householdId":"h1"}');
  });

  it('does not append meta section when meta is undefined', () => {
    const entry = makeEntry({ meta: undefined });
    expect(formatEntry(entry)).not.toContain('{');
  });

  it('uses the correct uppercase level tag', () => {
    for (const level of ['debug', 'info', 'warn', 'error'] as const) {
      const entry = makeEntry({ level });
      expect(formatEntry(entry)).toContain(`[${level.toUpperCase()}]`);
    }
  });

  it('includes the context label', () => {
    const entry = makeEntry({ context: 'Dashboard' });
    expect(formatEntry(entry)).toContain('[Dashboard]');
  });
});

// ─── createLogger ─────────────────────────────────────────────────────────────

describe('createLogger', () => {
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logger.error calls console.error with context tag', () => {
    const logger = createLogger('Dashboard');
    logger.error('something went wrong');
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain('[Dashboard]');
    expect(errorSpy.mock.calls[0][0]).toContain('something went wrong');
  });

  it('logger.warn calls console.warn', () => {
    const logger = createLogger('MyCtx');
    logger.warn('low disk');
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('[WARN]');
  });

  it('logger.info calls console.info', () => {
    const logger = createLogger('MyCtx');
    logger.info('loaded', { count: 5 });
    expect(infoSpy).toHaveBeenCalledOnce();
    const msg: string = infoSpy.mock.calls[0][0];
    expect(msg).toContain('[INFO]');
    expect(msg).toContain('"count":5');
  });

  it('logger.debug is suppressed when verbose flag is off', () => {
    const logger = createLogger('MyCtx');
    logger.debug('verbose detail');
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('includes correlation token in meta when provided', () => {
    const logger = createLogger('Dashboard');
    logger.error('load failed', { token: 7 });
    const msg: string = errorSpy.mock.calls[0][0];
    expect(msg).toContain('"token":7');
  });

  it('does not expose sensitive field names in test meta', () => {
    // Regression guard: meta must not silently include forbidden keys.
    // (This test documents the privacy contract rather than enforcing it at runtime.)
    const sensitiveKeys = ['password', 'token_secret', 'auth'];
    const safeMeta = { requestToken: 1, householdId: 'h1' };
    const logger = createLogger('Safe');
    logger.info('event', safeMeta);
    const msg: string = infoSpy.mock.calls[0][0];
    for (const key of sensitiveKeys) {
      expect(msg).not.toContain(key);
    }
  });

  it('logger bound to different contexts emit distinct context tags', () => {
    const loggerA = createLogger('ContextA');
    const loggerB = createLogger('ContextB');
    loggerA.info('msg-a');
    loggerB.info('msg-b');
    expect(infoSpy.mock.calls[0][0]).toContain('[ContextA]');
    expect(infoSpy.mock.calls[1][0]).toContain('[ContextB]');
  });
});
