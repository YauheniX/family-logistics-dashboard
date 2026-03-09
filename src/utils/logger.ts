/**
 * Structured logger utility.
 *
 * Provides levelled, context-tagged logging with optional metadata.
 * Privacy rules: never pass sensitive fields (passwords, full email addresses,
 * auth tokens, or personally-identifiable user data) in the `meta` argument.
 *
 * Log levels (ascending severity):
 *   debug  – verbose diagnostics; suppressed unless minimum level is "debug"
 *   info   – normal operational events
 *   warn   – recoverable anomalies
 *   error  – failures that need attention
 *
 * Configuration (env vars):
 *   VITE_LOG_LEVEL        – minimum level: "debug" | "info" | "warn" | "error" (default "info")
 *   VITE_VERBOSE_LOGS     – legacy flag; when "true" acts as VITE_LOG_LEVEL=debug
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Arbitrary metadata attached to a log entry.  Must not contain sensitive data. */
export type LogMeta = Record<string, unknown>;

/** A structured log entry as emitted internally. */
export interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  meta?: LogMeta;
}

// ─── Level priority ──────────────────────────────────────────────────────────

/** Numeric priority used to compare levels. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && value in LEVEL_PRIORITY;
}

/** Returns true when the legacy VITE_VERBOSE_LOGS flag is enabled. */
export function isVerboseLoggingEnabled(): boolean {
  return import.meta.env.VITE_VERBOSE_LOGS === 'true';
}

/**
 * Returns the minimum log level that will be emitted.
 *
 * Resolution order:
 *   1. VITE_LOG_LEVEL (if set to a valid level string)
 *   2. VITE_VERBOSE_LOGS=true  → "debug"  (backward-compat)
 *   3. Default → "info"
 */
export function getMinLogLevel(): LogLevel {
  const explicit = import.meta.env.VITE_LOG_LEVEL;
  if (isLogLevel(explicit)) return explicit;
  return isVerboseLoggingEnabled() ? 'debug' : 'info';
}

/** Returns true if `level` meets the minimum threshold. */
export function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLogLevel()];
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Format a LogEntry into a human-readable string.
 * Serialised meta is appended as a JSON fragment when present.
 */
export function formatEntry(entry: LogEntry): string {
  const meta = entry.meta !== undefined ? ` ${JSON.stringify(entry.meta)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}${meta}`;
}

// ─── Error serialization ─────────────────────────────────────────────────────

/**
 * Safely extract a loggable summary from an unknown caught value.
 *
 * Returns a plain object with `message` plus optional `code` / `name` fields
 * that can be spread directly into log meta.
 *
 * @example
 * ```ts
 * catch (err) {
 *   logger.error('Failed', serializeError(err));
 * }
 * ```
 */
export function serializeError(err: unknown): LogMeta {
  if (err instanceof Error) {
    const meta: LogMeta = { errorMessage: err.message };
    if (err.name && err.name !== 'Error') meta.errorName = err.name;
    if ('code' in err && (err as Record<string, unknown>).code !== undefined) {
      meta.errorCode = (err as Record<string, unknown>).code;
    }
    return meta;
  }
  if (typeof err === 'string') return { errorMessage: err };
  return { errorMessage: 'Unknown error' };
}

// ─── Pluggable sink ──────────────────────────────────────────────────────────

/**
 * A log sink receives every emitted LogEntry.
 * Register sinks via {@link addLogSink}.
 */
export type LogSink = (entry: LogEntry) => void;

const _sinks: LogSink[] = [];

/** Register an additional log sink (e.g. external error tracker). */
export function addLogSink(sink: LogSink): void {
  _sinks.push(sink);
}

/** Remove a previously registered sink. */
export function removeLogSink(sink: LogSink): void {
  const idx = _sinks.indexOf(sink);
  if (idx !== -1) _sinks.splice(idx, 1);
}

/** Remove all registered sinks (useful in tests). */
export function clearLogSinks(): void {
  _sinks.length = 0;
}

// ─── Ring buffer ─────────────────────────────────────────────────────────────

const DEFAULT_RING_SIZE = 100;
let _ringBuffer: LogEntry[] = [];
let _ringMaxSize = DEFAULT_RING_SIZE;

/**
 * Returns a snapshot of recent log entries (oldest first).
 * Useful for attaching to bug reports.
 */
export function getRecentLogs(): ReadonlyArray<LogEntry> {
  return [..._ringBuffer];
}

/** Clears the in-memory ring buffer. */
export function clearRecentLogs(): void {
  _ringBuffer = [];
}

/** Change the maximum number of entries kept in the ring buffer. */
export function setRingBufferSize(size: number): void {
  _ringMaxSize = Math.max(1, size);
  if (_ringBuffer.length > _ringMaxSize) {
    _ringBuffer = _ringBuffer.slice(-_ringMaxSize);
  }
}

function pushToRing(entry: LogEntry): void {
  _ringBuffer.push(entry);
  if (_ringBuffer.length > _ringMaxSize) {
    _ringBuffer.shift();
  }
}

// ─── Core emit ───────────────────────────────────────────────────────────────

function emit(context: string, level: LogLevel, message: string, meta?: LogMeta): void {
  const entry: LogEntry = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
    meta,
  };

  // Always push to ring buffer regardless of level filter
  pushToRing(entry);

  if (!shouldLog(level)) return;

  // Notify sinks
  for (const sink of _sinks) {
    try {
      sink(entry);
    } catch {
      // Never let a faulty sink break the app
    }
  }

  // Console output
  const formatted = formatEntry(entry);
  switch (level) {
    case 'debug':
      console.debug(formatted);
      break;
    case 'info':
      console.info(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'error':
      console.error(formatted);
      break;
  }
}

// ─── Logger interface ────────────────────────────────────────────────────────

/** Bound logger returned by createLogger. */
export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
  /** Create a child logger with a sub-context: "Parent.Child". */
  child(subContext: string): Logger;
  /**
   * Execute an async function and log its duration.
   *
   * @example
   * ```ts
   * const data = await logger.timed('loadDashboard', () => repo.load(id));
   * ```
   */
  timed<T>(label: string, fn: () => Promise<T>, meta?: LogMeta): Promise<T>;
}

/**
 * Create a logger bound to the given context label.
 *
 * @example
 * ```ts
 * const logger = createLogger('Dashboard');
 * logger.info('Data loaded', { token: 3, householdId: 'h1' });
 * // → [2025-01-01T00:00:00.000Z] [INFO] [Dashboard] Data loaded {"token":3,"householdId":"h1"}
 *
 * const childLog = logger.child('Init');
 * childLog.debug('step 1'); // → ... [Dashboard.Init] step 1
 * ```
 */
export function createLogger(context: string): Logger {
  const logger: Logger = {
    debug: (message, meta) => emit(context, 'debug', message, meta),
    info: (message, meta) => emit(context, 'info', message, meta),
    warn: (message, meta) => emit(context, 'warn', message, meta),
    error: (message, meta) => emit(context, 'error', message, meta),
    child: (subContext) => createLogger(`${context}.${subContext}`),
    timed: async <T>(label: string, fn: () => Promise<T>, meta?: LogMeta): Promise<T> => {
      const start = performance.now();
      try {
        const result = await fn();
        const durationMs = Math.round(performance.now() - start);
        emit(context, 'debug', `${label} completed`, { ...meta, durationMs });
        return result;
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        emit(context, 'error', `${label} failed`, { ...meta, durationMs, ...serializeError(err) });
        throw err;
      }
    },
  };
  return logger;
}
