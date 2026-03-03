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

## Feature Flag — Verbose Diagnostics

Set `VITE_VERBOSE_LOGS=true` in your `.env` (or `.env.local`) to enable `debug`-level output:

```env
# .env.local
VITE_VERBOSE_LOGS=true
```

When the flag is **not** set (the default), only `info`, `warn`, and `error` entries are emitted.

---

## Usage

```ts
import { createLogger } from '@/utils/logger';

// Create a logger bound to a context label
const logger = createLogger('Dashboard');

// Levels
logger.debug('Verbose detail', { token: 3 });
logger.info('Data loaded', { householdId: 'h1', count: 5 });
logger.warn('Stale request discarded', { token: 2 });
logger.error('Failed to load data', { token: 3 });
```

**Output format**

```
[2025-01-01T12:00:00.000Z] [INFO] [Dashboard] Data loaded {"householdId":"h1","count":5}
```

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

## Dashboard Logging (DashboardView)

The dashboard uses the logger for all critical data-loading paths:

| Event                                         | Level   | Meta                |
| --------------------------------------------- | ------- | ------------------- |
| `getDashboardSummary` returned an error       | `error` | `{ token }`         |
| Unexpected exception during data load         | `error` | `{ token }`         |
| Households failed to load on user change      | `error` | _(none)_            |
| Households failed to reload after invitation  | `error` | _(none)_            |

The **correlation token** (`token`) is an incrementing integer that identifies a specific load
request.  When the same token appears in multiple log lines you can trace the full lifecycle of
one load operation.

---

## Adding Logging to a New Feature

1. Import and instantiate a logger at the top of your file:

   ```ts
   import { createLogger } from '@/utils/logger';
   const logger = createLogger('MyFeature');
   ```

2. Replace `console.error` / `console.log` calls with the appropriate logger method.

3. Include a correlation token in the `meta` if your feature uses a request-token pattern.

4. **Never** pass raw `Error` objects or user data into `meta`; log only the error message or a
   sanitised subset.

---

## See Also

- `src/utils/logger.ts` — implementation
- `src/utils/__tests__/logger.test.ts` — unit tests
- `src/views/DashboardView.vue` — reference usage
