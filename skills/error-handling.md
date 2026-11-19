---
name: "Error Handling"
description: "Graceful degradation, structured logging, recovery patterns, retry logic, and observability integration."
phase: "build"
triggers:
  - "error handling"
  - "retry"
  - "fallback"
  - "logging"
  - "observability"
  - "resilience"
  - "circuit breaker"
  - "error recovery"
dependencies:
  - "backend-api-dev"
priority: 4
version: "1.0"
---

## When to Use

Invoke this skill when:
- Designing new service capabilities with error paths
- Adding error handling to existing code paths
- Setting up logging, metrics, or tracing
- Implementing retry logic, circuit breakers, or fallback behavior
- Building resilient systems that degrade gracefully

**Prerequisite**: `backend-api-dev` should be complete enough to understand the service's API surface.

---

## How to Execute

### Step 1: Classify Errors by Type

Not all errors are equal. Classify each error category explicitly:

**Retryable errors** (temporary, may resolve on retry):
- Network timeouts and connection failures
- HTTP 429 (rate limited) and HTTP 503 (service temporarily unavailable)
- Database connection pool exhaustion
- Transient infrastructure failures

**Non-retryable errors** (retrying won't help, fix the root cause):
- 400 Bad Request — the request is invalid, resending won't change that
- 401 Unauthorized — authentication required, need a new token
- 404 Not Found — the resource doesn't exist, retrying won't create it
- 422 Unprocessable Entity — semantic validation failure, not a transient issue

**Fatal errors** (requires human intervention):
- Database schema mismatch
- Configuration errors on startup
- Unhandled exceptions indicating programming errors

Design error handling for each category — the wrong response to any category causes problems.

### Step 2: Design a Consistent Error Response Schema

Every API endpoint should use the same error envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested user with id 'abc' was not found",
    "details": {},
    "request_id": "req_xyz789",
    "timestamp": "2026-06-10T14:30:00Z"
  }
}
```

- **`code`**: machine-readable, SCREAMING_SNAKE_CASE — always stable across versions
- **`message`**: human-readable explanation (safe to show to developers/ops, not necessarily end users)
- **`details`**: additional structured data relevant to the error (validation field errors, etc.)
- **`request_id`**: ties this error to a specific request in logs
- **Never expose** stack traces, internal file paths, SQL errors, or library versions in production responses

### Step 3: Implement Structured Logging

Write logs that can be searched, filtered, and aggregated. Never use `console.log` or unstructured strings in production:

```json
{
  "level": "error",
  "timestamp": "2026-06-10T14:30:00Z",
  "message": "Database query failed",
  "service": "user-service",
  "request_id": "req_xyz789",
  "user_id": "usr_123",
  "query": "SELECT * FROM orders WHERE user_id = $1",
  "error": "connection refused",
  "duration_ms": 5000,
  "stack": "Error: connection refused\n    at Pool.connect (...)\n    ..."
}
```

**Log levels:**
- `ERROR` — something is wrong and needs attention now (log stack trace)
- `WARN` — something unexpected happened but the system is coping (non-fatal errors)
- `INFO` — significant, expected events (service started, deployment, significant business events)
- `DEBUG` — detailed information for debugging in development only

Include context in every log: request ID, user ID, operation name, duration. You need this to debug in production.

### Step 4: Implement Retry Logic

For retryable errors:

- **Exponential backoff with jitter**: wait 100ms, then 200ms, then 400ms, with randomization to avoid thundering herds
- **Maximum retry attempts**: typically 3. More than that and the failure is likely not transient.
- **Only retry idempotent operations**: GET, DELETE, and properly-designed PUT/PATCH are safe to retry. Unsafe to retry POST without idempotency keys.
- **Distinguish retryable from non-retryable errors** — do not retry validation errors or auth failures

```python
# Pattern: exponential backoff with jitter
def backoff(attempt: int, base: float = 0.1, max_delay: float = 10.0) -> float:
    delay = base * (2 ** attempt)
    jitter = random.uniform(0, delay * 0.1)  # 10% jitter
    return min(delay + jitter, max_delay)
```

### Step 5: Implement Circuit Breakers

Prevent cascade failures when a downstream service is unhealthy:

- **Closed state**: normal operation, requests pass through
- **Open state**: circuit is tripped, requests fail immediately with a fallback (no point hammering a dead service)
- **Half-open state**: after a timeout, allow one test request through; if it succeeds, close the circuit; if it fails, reopen it

Configure:
- **Failure threshold**: open after N failures in a window (e.g., 5 failures in 10 seconds)
- **Reset timeout**: how long to stay open before testing recovery (e.g., 30 seconds)
- **Fallback behavior**: what to return when the circuit is open (cached data, degraded response, clear error message)

### Step 6: Add Observability Endpoints

- **`/health/live`** (liveness probe): is the process alive? If false, restart it. Simple `200 OK`.
- **`/health/ready`** (readiness probe): is it ready to serve traffic? Checks dependencies — can it reach the database, other services? Return `503` if not ready, so load balancers stop sending traffic.
- Include dependency health checks in `ready`: database reachable, cache reachable, downstream services responding.

---

## Best Practices

1. **Fail fast for validation errors, log and retry for transient errors** — don't waste cycles retrying things that will never succeed.
2. **Every error at ERROR level should include full context** — you should never need to reproduce the error to understand what happened.
3. **Retry with exponential backoff, not immediate retries** — immediate retries make things worse under load.
4. **Circuit breakers prevent cascade failures** — when a dependency is unhealthy, stop hammering it and fail gracefully.
5. **Crash loops in production are never acceptable** — log the error and exit cleanly; let orchestration restart the process.
6. **Return a consistent error envelope** — clients should be able to parse all error responses identically.

---

## Anti-Patterns

- **Swallowing errors**: `try { } catch { }` — the error disappears and debugging becomes impossible
- **Logging the same error in multiple places** — one log entry with full context is better than ten with partial context
- **Using console.log/print instead of structured logging** — unstructured logs cannot be searched or aggregated effectively
- **Retrying non-idempotent operations** without idempotency keys — creates duplicate records, double charges, etc.
- **Not having visibility into error rates in production** — if you don't know how often errors happen, you can't tell if things are getting better or worse
- **Returning detailed internal errors to clients** — stack traces, SQL errors, file paths are security leaks

---

## Quality Signals

- Error rates are visible in dashboards and alerting is configured
- All errors include a request_id (correlation ID) for traceability
- Retry behavior is logged (attempt count, final success/failure)
- Circuit breaker state transitions are tracked
- Fallback behavior works correctly when primary paths fail
- Health endpoints return accurate dependency status
- Error response schema is consistent across all endpoints
- No crash loops in production — crashes are logged and exited cleanly
- Stack traces are captured and visible in logs for all unhandled exceptions