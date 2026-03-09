import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isVerboseLoggingEnabled,
  getMinLogLevel,
  shouldLog,
  formatEntry,
  createLogger,
  serializeError,
  addLogSink,
  removeLogSink,
  clearLogSinks,
  getRecentLogs,
  clearRecentLogs,
  setRingBufferSize,
  type LogEntry,
  type LogSink,
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

// ─── serializeError ──────────────────────────────────────────────────────────

describe('serializeError', () => {
  it('extracts message from Error instances', () => {
    expect(serializeError(new Error('boom'))).toEqual({ errorMessage: 'boom' });
  });

  it('includes name if non-default', () => {
    const err = new TypeError('bad type');
    const result = serializeError(err);
    expect(result.errorMessage).toBe('bad type');
    expect(result.errorName).toBe('TypeError');
  });

  it('includes code property when present', () => {
    const err = Object.assign(new Error('fail'), { code: 'ENOENT' });
    expect(serializeError(err)).toEqual({
      errorMessage: 'fail',
      errorCode: 'ENOENT',
    });
  });

  it('handles plain string errors', () => {
    expect(serializeError('something broke')).toEqual({ errorMessage: 'something broke' });
  });

  it('returns unknown error for non-Error/non-string', () => {
    expect(serializeError(42)).toEqual({ errorMessage: 'Unknown error' });
    expect(serializeError(null)).toEqual({ errorMessage: 'Unknown error' });
    expect(serializeError(undefined)).toEqual({ errorMessage: 'Unknown error' });
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
    clearRecentLogs();
    clearLogSinks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearRecentLogs();
    clearLogSinks();
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

// ─── child logger ────────────────────────────────────────────────────────────

describe('child logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearRecentLogs();
    clearLogSinks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearRecentLogs();
    clearLogSinks();
  });

  it('creates a sub-context with dot notation', () => {
    const parent = createLogger('Household');
    const child = parent.child('Init');
    child.info('started');
    const msg: string = vi.mocked(console.info).mock.calls[0][0];
    expect(msg).toContain('[Household.Init]');
  });

  it('supports nested children', () => {
    const grandchild = createLogger('A').child('B').child('C');
    grandchild.info('deep');
    const msg: string = vi.mocked(console.info).mock.calls[0][0];
    expect(msg).toContain('[A.B.C]');
  });
});

// ─── timed ───────────────────────────────────────────────────────────────────

describe('timed', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearRecentLogs();
    clearLogSinks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearRecentLogs();
    clearLogSinks();
  });

  it('returns the function result on success', async () => {
    const logger = createLogger('Perf');
    const result = await logger.timed('op', async () => 42);
    expect(result).toBe(42);
  });

  it('logs duration on success in ring buffer', async () => {
    const logger = createLogger('Perf');
    await logger.timed('loadData', async () => 'ok');
    const logs = getRecentLogs();
    const timedEntry = logs.find((e) => e.message === 'loadData completed');
    expect(timedEntry).toBeDefined();
    expect(timedEntry!.meta).toHaveProperty('durationMs');
    expect(typeof timedEntry!.meta!.durationMs).toBe('number');
  });

  it('logs error and rethrows on failure', async () => {
    const logger = createLogger('Perf');
    await expect(
      logger.timed('failOp', async () => {
        throw new Error('timeout');
      }),
    ).rejects.toThrow('timeout');
    const logs = getRecentLogs();
    const errorEntry = logs.find((e) => e.message === 'failOp failed');
    expect(errorEntry).toBeDefined();
    expect(errorEntry!.meta).toHaveProperty('durationMs');
    expect(errorEntry!.meta!.errorMessage).toBe('timeout');
  });

  it('includes extra meta in timed log', async () => {
    const logger = createLogger('Perf');
    await logger.timed('op', async () => 1, { householdId: 'h1' });
    const logs = getRecentLogs();
    const entry = logs.find((e) => e.message === 'op completed');
    expect(entry!.meta!.householdId).toBe('h1');
  });
});

// ─── Log sinks ───────────────────────────────────────────────────────────────

describe('log sinks', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearLogSinks();
    clearRecentLogs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearLogSinks();
    clearRecentLogs();
  });

  it('notifies registered sinks on each log entry', () => {
    const sink: LogSink = vi.fn();
    addLogSink(sink);
    const logger = createLogger('SinkTest');
    logger.info('hello');
    expect(sink).toHaveBeenCalledOnce();
    expect((sink as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      level: 'info',
      context: 'SinkTest',
      message: 'hello',
    });
  });

  it('removeLogSink stops notification', () => {
    const sink: LogSink = vi.fn();
    addLogSink(sink);
    removeLogSink(sink);
    createLogger('X').info('ignored');
    expect(sink).not.toHaveBeenCalled();
  });

  it('clearLogSinks removes all sinks', () => {
    const s1: LogSink = vi.fn();
    const s2: LogSink = vi.fn();
    addLogSink(s1);
    addLogSink(s2);
    clearLogSinks();
    createLogger('X').info('ignored');
    expect(s1).not.toHaveBeenCalled();
    expect(s2).not.toHaveBeenCalled();
  });

  it('a faulty sink does not break logging', () => {
    addLogSink(() => {
      throw new Error('sink failure');
    });
    const logger = createLogger('Robust');
    expect(() => logger.info('still works')).not.toThrow();
    expect(vi.mocked(console.info)).toHaveBeenCalledOnce();
  });
});

// ─── Ring buffer ─────────────────────────────────────────────────────────────

describe('ring buffer', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    clearRecentLogs();
    clearLogSinks();
    setRingBufferSize(100);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearRecentLogs();
    clearLogSinks();
    setRingBufferSize(100);
  });

  it('stores log entries', () => {
    const logger = createLogger('Ring');
    logger.info('one');
    logger.warn('two');
    const logs = getRecentLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe('one');
    expect(logs[1].message).toBe('two');
  });

  it('returns a snapshot (not live reference)', () => {
    const logger = createLogger('Ring');
    logger.info('a');
    const snapshot = getRecentLogs();
    logger.info('b');
    expect(snapshot).toHaveLength(1);
    expect(getRecentLogs()).toHaveLength(2);
  });

  it('evicts oldest entries when buffer is full', () => {
    setRingBufferSize(3);
    const logger = createLogger('Ring');
    logger.info('a');
    logger.info('b');
    logger.info('c');
    logger.info('d');
    const logs = getRecentLogs();
    expect(logs).toHaveLength(3);
    expect(logs[0].message).toBe('b');
    expect(logs[2].message).toBe('d');
  });

  it('clearRecentLogs empties the buffer', () => {
    const logger = createLogger('Ring');
    logger.info('x');
    clearRecentLogs();
    expect(getRecentLogs()).toHaveLength(0);
  });

  it('setRingBufferSize trims existing entries', () => {
    const logger = createLogger('Ring');
    logger.info('a');
    logger.info('b');
    logger.info('c');
    setRingBufferSize(2);
    const logs = getRecentLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe('b');
  });
});
