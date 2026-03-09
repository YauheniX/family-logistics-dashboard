# Logging Policy

**Last Updated**: March 2026

---

## Overview

The application uses a thin **structured logger** (`src/utils/logger.ts`) instead of raw `console.*`
calls. Every log line is tagged with a **context label**, a **level**, and an **ISO timestamp** so
that log streams are easy to filter and correlate.

---

## Log Levels

| Level   | When to use                                                    |
| ------- | -------------------------------------------------------------- |
| `debug` | Verbose diagnostics — suppressed in production by default      |
| `info`  | Normal operational events (e.g. data loaded successfully)      |
| `warn`  | Recoverable anomalies (e.g. stale request discarded)           |
| `error` | Failures that need attention (e.g. RPC call returned an error) |

---

## Configuration

### `VITE_LOG_LEVEL` (recommended)

Set the minimum log level in your `.env` (or `.env.local`):

```env
# .env.local
VITE_LOG_LEVEL=debug    # debug | info | warn | error (default: info)
```

### `VITE_VERBOSE_LOGS` (legacy)

The boolean flag `VITE_VERBOSE_LOGS=true` is still supported for backward compatibility and
behaves like `VITE_LOG_LEVEL=debug`. When both are set, `VITE_LOG_LEVEL` takes precedence.

---

## Usage

```ts
import { createLogger, serializeError } from '@/utils/logger';

// Create a logger bound to a context label
const logger = createLogger('Dashboard');

// Levels
logger.debug('Verbose detail', { token: 3 });
logger.info('Data loaded', { householdId: 'h1', count: 5 });
logger.warn('Stale request discarded', { token: 2 });
logger.error('Failed to load data', { token: 3 });
```

Output format:

```text
[2025-01-01T12:00:00.000Z] [INFO] [Dashboard] Data loaded {"householdId":"h1","count":5}
```

---

## Error Serialization

Use `serializeError()` instead of manually extracting error messages:

```ts
import { createLogger, serializeError } from '@/utils/logger';

const logger = createLogger('MyFeature');

try {
  await riskyOperation();
} catch (err) {
  // ✅ Good — concise and consistent
  logger.error('Operation failed', serializeError(err));

  // ✅ Good — with extra context
  logger.error('Operation failed', { token: 3, ...serializeError(err) });

  // ❌ Avoid — repetitive boilerplate
  logger.error('Operation failed', {
    errorMessage: err instanceof Error ? err.message : 'Unknown error',
  });
}
```

`serializeError()` safely extracts `errorMessage`, and optionally `errorName` and `errorCode`
from the caught value.

---

## Child Loggers

Use `logger.child()` to create sub-context loggers for different concerns within a file:

```ts
const logger = createLogger('Household');
const initLog = logger.child('Init'); // → [Household.Init]
const deleteLog = logger.child('Delete'); // → [Household.Delete]

initLog.debug('Starting initialization');
deleteLog.error('Failed to delete');
```

Children can be nested: `logger.child('A').child('B')` → `[Parent.A.B]`.

---

## Performance Timing

Use `logger.timed()` to measure and log async operation duration:

```ts
const logger = createLogger('Dashboard');

// Automatically logs duration on success (debug level) or failure (error level)
const data = await logger.timed('loadDashboard', () => repo.getDashboardSummary(id, userId));

// With extra meta
await logger.timed('loadLists', () => store.loadLists(id), { householdId: id });
```

Output on success:

```text
[...] [DEBUG] [Dashboard] loadDashboard completed {"durationMs":142}
```

Output on failure:

```text
[...] [ERROR] [Dashboard] loadDashboard failed {"durationMs":3012,"errorMessage":"timeout"}
```

---

## Log Sinks (Pluggable Transports)

Register custom log sinks to send entries to external services:

```ts
import { addLogSink, removeLogSink, clearLogSinks, type LogSink } from '@/utils/logger';

// Send errors to an external tracking service
const sentrySink: LogSink = (entry) => {
  if (entry.level === 'error') {
    captureException(entry);
  }
};

addLogSink(sentrySink);

// Later: remove a specific sink
removeLogSink(sentrySink);

// Or clear all sinks (useful in tests)
clearLogSinks();
```

Sinks receive every `LogEntry` that passes the level filter. A faulty sink (one that throws)
will not break application logging.

---

## In-Memory Ring Buffer

The logger keeps the most recent 100 log entries in memory. This buffer is automatically
attached to bug reports submitted via the issue reporter.

```ts
import { getRecentLogs, clearRecentLogs, setRingBufferSize } from '@/utils/logger';

// Get a snapshot of recent entries
const entries = getRecentLogs();

// Adjust capacity (default: 100)
setRingBufferSize(200);

// Clear (e.g. on logout)
clearRecentLogs();
```

### Integration with Issue Reporter

When a user submits a bug report via `reportProblem()`, the description is automatically
enriched with recent log entries in a collapsible `<details>` block. No action is needed — this
happens transparently.

---

## Privacy Rules

Logs **must not** contain sensitive data. Before passing anything to the `meta` argument, verify
that it does **not** include:

- Passwords or secret tokens
- Full email addresses or other PII
- Auth session tokens or API keys
- Any field that could identify a specific person

**Acceptable meta fields** include: request/correlation tokens (counters), household IDs (opaque
UUIDs with no user context on their own), item counts, status codes, and timing values.

### Examples

```ts
// ✅ Safe — correlation token only
logger.error('Failed to load data', { token: currentToken });

// ✅ Safe — opaque ID + count
logger.info('Loaded lists', { householdId: 'h1', count: 3 });

// ❌ Unsafe — contains email
logger.info('User action', { email: user.email });

// ❌ Unsafe — contains auth token
logger.debug('Request sent', { authToken: session.access_token });
```

---

## Adding Logging to a New Feature

1. Import and instantiate a logger at the top of your file:

   ```ts
   import { createLogger, serializeError } from '@/utils/logger';
   const logger = createLogger('MyFeature');
   ```

2. Replace `console.error` / `console.log` calls with the appropriate logger method.

3. Use `serializeError(err)` in catch blocks instead of manual error extraction.

4. Use `logger.child('SubTask')` if the file has multiple distinct concerns.

5. Use `logger.timed('label', fn)` for operations where duration matters.

6. Include a correlation token in the `meta` if your feature uses a request-token pattern.

7. **Never** pass raw `Error` objects or user data into `meta`.

---

## See Also

- `src/utils/logger.ts` — implementation
- `src/utils/__tests__/logger.test.ts` — unit tests
- `src/views/DashboardView.vue` — reference usage
- `src/services/issueReporter.ts` — ring buffer integration
