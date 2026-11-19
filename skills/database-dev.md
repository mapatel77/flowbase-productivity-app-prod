---
name: "Database Development"
description: "Schema design, migration management, query optimization, indexing strategies, and data integrity patterns."
phase: "build"
triggers:
  - "database"
  - "schema"
  - "migration"
  - "query"
  - "sql"
  - "index"
  - "postgres"
  - "mysql"
  - "mongodb"
dependencies:
  - "architecture-design"
priority: 3
version: "1.0"
---

## When to Use

Invoke this skill when:
- Designing or modifying database schemas
- Writing database migrations
- Adding indexes or optimizing slow queries
- Planning data migration for schema changes
- Working with any raw SQL or ORM query that fetches or modifies data

**Prerequisite**: `architecture-design` should provide data models and relationships to work from.

---

## How to Execute

### Step 1: Design or Review Schema

For each entity:

- **Normalize to 3NF** — eliminate redundant data, each fact in one place
- **Choose appropriate data types**: use `TIMESTAMP`/`DATETIME` for dates, not strings; `UUID` or bigint for IDs, not strings; `BOOLEAN` for flags, not strings; `DECIMAL` for money, not `FLOAT`
- **Add constraints**: `NOT NULL` where values are mandatory, `UNIQUE` where uniqueness is required, `CHECK` for business rules (e.g., `CHECK (quantity > 0)`)
- **Define foreign keys** for referential integrity — the database should prevent orphaned records
- **Add audit columns**: `created_at TIMESTAMP NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMP` (auto-update on row change)
- **Consider soft deletes**: `deleted_at TIMESTAMP NULL` instead of `DELETE` — preserves data for recovery and debugging
- **Name things descriptively**: `users.id`, `orders.user_id`, `order_items.order_id` — clear naming eliminates ambiguity

### Step 2: Write Migrations

Use a migration tool appropriate to your framework (Alembic for Python/SQLAlchemy, TypeORM migrations, Rails migrations, Flyway, Liquibase):

- **Each migration does one thing** — adding a column, creating an index, populating seed data. Don't combine unrelated changes.
- **Migrations must be both forward and backward compatible**:
  - Forward: running on version N-1 schema produces version N schema
  - Backward: rolling back from version N returns to version N-1 without data loss
  - Two-phase deploys: old code must work on new schema during rollout, new code must work on old schema during rollback
- **Never modify existing migrations** — only add new ones. Existing migrations are the source of truth for what the schema looked like at each point in time.
- **Test both `up` and `down`** thoroughly before considering a migration complete
- **Backup before destructive migrations**: column drops, table drops, data migrations in production

### Step 3: Add Indexes Strategically

Indexes speed up reads but slow down writes. Choose carefully:

- **Index foreign keys** — the database needs them to enforce referential integrity efficiently
- **Index columns used in `WHERE` clauses** for common queries
- **Index columns used in `ORDER BY`** when combined with range filters
- **Composite indexes**: order matters. `(user_id, created_at)` supports queries filtering by `user_id` alone and by `user_id + created_at`, but not `created_at` alone.
- **Partial indexes**: `CREATE INDEX orders_active ON orders (id) WHERE status = 'pending'` — smaller, faster, for specific query subsets
- **Avoid over-indexing**: every index adds write overhead. If a query isn't run frequently enough to matter, the index isn't worth it.
- **Use `EXPLAIN`** (or `EXPLAIN ANALYZE`) to verify the query planner uses the expected index — it doesn't always.

### Step 4: Optimize Queries

- **`EXPLAIN` everything** — understand the query plan before optimizing. You're guessing without it.
- **Avoid `SELECT *`** — fetch only the columns needed. Fetching unnecessary columns wastes memory and network bandwidth.
- **Use pagination** for large result sets — `LIMIT` and `OFFSET` (or cursor-based for large tables)
- **Batch operations** where possible: inserting 1000 rows as a single `INSERT ... VALUES (...), (...), ...` is dramatically faster than 1000 individual inserts.
- **Watch for N+1 queries**: loading a list and then loading each related item individually. Use `JOIN`s or eager loading.
- **Avoid functions on indexed columns in `WHERE` clauses** — `WHERE LOWER(email) = ...` prevents index use. Use expression indexes or restructure.

### Step 5: Handle Data Safety

- **No `DELETE` without understanding cascades** — know what happens to child records. Restrict foreign keys with `ON DELETE RESTRICT` until you're certain.
- **Plan data migration before schema changes** in production — adding a `NOT NULL` column to a table with millions of rows takes significant time and locks the table unless done carefully.
- **Backup before destructive operations** and verify the backup is restorable before proceeding.
- **Use transactions** for multi-step changes that must be atomic — begin, commit, rollback appropriately.
- **Be explicit about isolation levels** if the default (usually read committed) isn't right for your use case. Serializable has a performance cost.

---

## Best Practices

1. **Use appropriate data types**: timestamps for dates, not strings. UUIDs/bigints for IDs, not strings. Booleans for flags. Decimals for money.
2. **Name constraints descriptively**: `fk_users_orders` beats `fk_1`. You'll grep for these later.
3. **Keep migrations small and focused**: one logical change per migration. Easier to review, easier to roll back.
4. **Use transactions for complex migration steps**: running multiple related changes together.
5. **Document non-obvious decisions**: "Why is this denormalized?", "Why this index on a write-heavy table?" — future you will thank present you.
6. **Test migration performance on a realistic data volume** before running in production.

---

## Anti-Patterns

- **Using string columns for dates, numbers, or booleans** — loses type safety, performance, and correctness (sorting, comparison, validation)
- **Creating indexes "just in case"** — indexes have a real cost on write performance and storage
- **Making breaking changes without a migration path**: dropping a column, changing a type, removing an index — all need migration strategies
- **Ignoring table bloat** from high-volume update workloads — consider partitioning or archiving old data
- **Not considering migration impact on production**: large table alterations lock the table; use `pg Online DDL` patterns or equivalent for zero-downtime migrations
- **Not testing migration rollback** — assuming rollback works is not the same as knowing it works

---

## Quality Signals

- Schema passes validation: correct types, constraints, relationships, naming conventions
- Migrations run successfully on a fresh database from zero
- Migrations can be rolled back without data loss
- Query performance is acceptable at projected production scale — verified with `EXPLAIN`
- No N+1 query patterns in common operations
- Migration downtime and lock contention are estimated before production rollout
- Soft-deletes used where appropriate, not indiscriminately
- Audit columns present on tables where data changes over time
- Composite indexes documented with which queries they serve