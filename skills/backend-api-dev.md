---
name: "Backend API Development"
description: "REST/GraphQL API design, request validation, response contracts, authentication patterns, and error handling."
phase: "build"
triggers:
  - "api"
  - "endpoint"
  - "rest"
  - "graphql"
  - "backend"
  - "server"
  - "request validation"
dependencies:
  - "architecture-design"
priority: 2
version: "1.0"
---

## When to Use

Invoke this skill when:
- Creating new API endpoints or services
- Adding features to existing APIs
- Designing API contracts between services
- Implementing authentication or authorization logic

**Prerequisite**: `architecture-design` should provide API contracts and component boundaries.

---

## How to Execute

### Step 1: Define the API Contract Before Coding

Write down the contract before writing a line of code:

**For REST:**
- HTTP method and full path (e.g., `GET /users/{id}/orders`)
- Path, query, and header parameters
- Request body schema (if applicable) — with field types and constraints
- Response body schema for success (200/201) and all error variants (400, 401, 403, 404, 500)
- Authentication requirements (what header, what format)

**For GraphQL:**
- Query or mutation name and operation signature
- Input type definitions with constraints
- Response type definition
- Error extension structure

This contract is the agreement between the server and every client. Changing it costs more the later in development it's done.

### Step 2: Implement Input Validation

**Never trust the client.** Validate on the server always.

- Use a schema validation library appropriate to your language (Zod/Yup/Joi for Node, Pydantic for Python, etc.)
- Validate types, required fields, string formats (email, UUID, date), numeric ranges, enums
- Return `400 Bad Request` with a descriptive error message for validation failures
- Log invalid requests with enough context to detect abuse patterns — but never log passwords or tokens
- Reject oversized payloads before parsing to avoid memory exhaustion

**Error response shape** (be consistent across all endpoints):
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ],
    "request_id": "req_abc123"
  }
}
```

### Step 3: Implement Business Logic

- Keep controllers thin — they parse input and delegate to the service layer
- Service layer handles business logic, transactions, and coordination
- Never put business logic in controllers or directly in route handlers
- Use database transactions for operations that must be atomic — multiple writes that must all succeed or all fail
- Implement optimistic locking when concurrent updates are possible (version column, `UPDATE ... WHERE version = X`)

### Step 4: Structure API Responses

- Use a consistent envelope format across all endpoints. Options:
  - Data envelope: `{ "data": {...} }`
  - Error envelope: `{ "error": {...} }`
- Include a `request_id` (or correlation ID) in every response — this ties logs to the request
- Return appropriate HTTP status codes:
  - `200 OK` — success
  - `201 Created` — resource created (include `Location` header pointing to the new resource)
  - `204 No Content` — success with no body (DELETE, some updates)
  - `400 Bad Request` — invalid input
  - `401 Unauthorized` — not authenticated
  - `403 Forbidden` — authenticated but not authorized
  - `404 Not Found` — resource doesn't exist
  - `409 Conflict` — state conflict (duplicate, optimistic lock failure)
  - `429 Too Many Requests` — rate limited
  - `500 Internal Server Error` — unexpected server error

### Step 5: Document the API

- Use OpenAPI (Swagger) specification — auto-generate from code where possible
- Keep documentation in sync with implementation — stale docs are worse than no docs
- Include example requests and responses for each endpoint
- Document all error codes and their meanings
- Document rate limits and authentication requirements

### Step 6: Security Considerations

- **Authentication**: validate credentials, check token expiry, verify signature
- **Authorization**: check permissions after authentication, not before
- **Input sanitization**: prevent injection attacks (SQL, NoSQL, command injection)
- **Output encoding**: escape data appropriately for context (HTML, JSON, URL)
- **CORS**: be explicit about allowed origins, methods, and headers

---

## Best Practices

1. **Follow REST conventions**: use proper HTTP methods (GET for reads, POST for creates, PUT/PATCH for updates, DELETE for deletes), nouns in paths (not verbs), proper status codes.
2. **Version APIs from day one**: `Accept: application/vnd.myapi.v1+json` or path prefix `/api/v1/`. Changing an API without versioning breaks clients.
3. **Return consistent envelope format** across all endpoints — clients should not need different parsing logic per endpoint.
4. **Implement idempotency keys** for POST endpoints — clients can safely retry without creating duplicate resources.
5. **Pagination on list endpoints**: cursor-based for large or frequently-updated datasets, offset-based for smaller static sets. Never return unbounded result sets.
6. **Request IDs everywhere**: generate on admission, include in logs, return in responses — essential for distributed tracing.

---

## Anti-Patterns

- Using `GET` for mutations — violates HTTP semantics and breaks caching, logging, security scanning
- Returning `200 OK` for errors — the status code should reflect what happened
- Missing pagination — returning thousands of records kills performance for client, server, and network
- Not handling timeout and connection error scenarios — clients need to know when to retry
- Returning full database objects when clients only need a subset of fields — over-fetching is a performance tax
- Leaking internal errors in production responses — stack traces and internal paths go to logs, not to clients

---

## Quality Signals

- OpenAPI documentation exists and matches the implementation
- All inputs are validated with descriptive error messages pointing to the specific field
- Error responses use a consistent structure across all endpoints
- HTTP status codes correctly reflect outcomes
- Authentication and authorization are tested with both valid and invalid credentials
- Response times are documented and within SLA at expected load
- Pagination works correctly, including with empty result sets
- API handles concurrent requests without race conditions