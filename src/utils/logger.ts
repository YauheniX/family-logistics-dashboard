/**
 * Structured logger utility.
 *
 * Provides levelled, context-tagged logging with optional metadata.
 * Privacy rules: never pass sensitive fields (passwords, full email addresses,
 * auth tokens, or personally-identifiable user data) in the `meta` argument.
 *
 * Log levels:
 *   debug  – verbose diagnostics; only emitted when VITE_VERBOSE_LOGS=true
 *   info   – normal operational events
 *   warn   – recoverable anomalies
 *   error  – failures that need attention
 *
 * Feature flag:
 *   Set VITE_VERBOSE_LOGS=true in your .env file to enable debug output.
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

/** Numeric priority used to compare levels. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Returns true when verbose/debug logging is enabled via the feature flag. */
export function isVerboseLoggingEnabled(): boolean {
  return import.meta.env.VITE_VERBOSE_LOGS === 'true';
}

/** Returns the minimum log level that will be emitted. */
export function getMinLogLevel(): LogLevel {
  return isVerboseLoggingEnabled() ? 'debug' : 'info';
}

/** Returns true if `level` meets the minimum threshold. */
export function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[getMinLogLevel()];
}

/**
 * Format a LogEntry into a human-readable string.
 * Serialised meta is appended as a JSON fragment when present.
 */
export function formatEntry(entry: LogEntry): string {
  const meta = entry.meta !== undefined ? ` ${JSON.stringify(entry.meta)}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.context}] ${entry.message}${meta}`;
}

/** Bound logger returned by createLogger. */
export interface Logger {
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

/**
 * Create a logger bound to the given context label.
 *
 * @example
 * ```ts
 * const logger = createLogger('Dashboard');
 * logger.info('Data loaded', { token: 3, householdId: 'h1' });
 * // → [2025-01-01T00:00:00.000Z] [INFO] [Dashboard] Data loaded {"token":3,"householdId":"h1"}
 * ```
 */
export function createLogger(context: string): Logger {
  function emit(level: LogLevel, message: string, meta?: LogMeta): void {
    if (!shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      context,
      message,
      timestamp: new Date().toISOString(),
      meta,
    };

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

  return {
    debug: (message, meta) => emit('debug', message, meta),
    info: (message, meta) => emit('info', message, meta),
    warn: (message, meta) => emit('warn', message, meta),
    error: (message, meta) => emit('error', message, meta),
  };
}
