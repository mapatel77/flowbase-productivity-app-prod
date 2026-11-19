---
name: "Testing & TDD"
description: "Test strategy development, coverage targets, unit/integration/e2e patterns, mocking, and fixture management."
phase: "test"
triggers:
  - "test"
  - "tdd"
  - "coverage"
  - "unit test"
  - "integration test"
  - "e2e"
  - "mock"
  - "fixture"
  - "jest"
  - "pytest"
  - "unittest"
dependencies:
  - "backend-api-dev"
  - "database-dev"
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- Starting a new feature using TDD (write tests first)
- Improving test coverage on existing code
- Setting up test infrastructure for a new project
- Debugging via tests rather than checking production behavior

**Prerequisite**: Implementation skills (backend, frontend, database) should be complete enough to write tests against.

---

## How to Execute

### Step 1: Define Test Strategy

Before writing a single test, document the strategy:

| Test Type | What it covers | Where it runs |
|---|---|---|
| **Unit tests** | Single functions/methods in isolation | In-process, no I/O, mocked dependencies |
| **Integration tests** | Component interactions, database, file I/O | Against real dependencies (in containers) |
| **End-to-end tests** | Critical user journeys in a browser | Against running application |
| **Contract tests** | API compatibility between services | Service-to-service |

Set a **coverage target**: typically 80% for meaningful coverage. 100% coverage is not a guarantee of quality — it's possible to hit 100% with shallow tests.

Choose tooling and framework before starting. Document why.

### Step 2: Write Tests (TDD or Alongside)

**TDD approach** (red-green-refactor):
1. Write a failing test that describes the behavior you want
2. Write the minimal code to make it pass
3. Refactor, maintaining passing tests

**Alongside approach**:
1. Write implementation
2. Write tests that verify implementation matches spec

**Arrange-Act-Assert** — structure every test:
```python
def test_user_notifies_when_order_shipped():
    # Arrange
    user = UserFactory(email="alice@example.com")
    order = OrderFactory(status="pending", user=user)
    notifier = EmailNotifier(mock_smtp=True)

    # Act
    notifier.on_order_shipped(order)

    # Assert
    assert notifier.emails_sent == [
        {"to": "alice@example.com", "subject": "Your order has shipped"}
    ]
```

Name tests descriptively: `test_order_shipped_email_recipient_matches_order_user_email`.

### Step 3: Manage Mocks and Fixtures

**Mocks** — use sparingly. Mock external dependencies (databases, APIs, file system) to keep tests fast. Do not mock the thing you are testing.

**Rule of thumb**: If you're mocking more than 2-3 things in a test, the design may have a problem — the component under test may know too much about its collaborators.

**Fixtures**:
- Use factories or builders for test data: `UserFactory.build()` creates without saving, `UserFactory.create()` saves to database
- Keep fixtures minimal but realistic — only set fields that are relevant to the test
- Use `before_each` setup, not class-level state that bleeds between tests

### Step 4: Handle Async and Time-Dependent Code

- Use `async/await` properly — always `await` in tests and handle promise rejection
- Add test timeouts to catch test hangs (a test that never completes is worse than no test)
- For time-dependent code (scheduled jobs, expiration): use fake timers or injectable clocks
- Never use `time.sleep()` in tests — use mock time instead

### Step 5: Make Tests Reliable and Fast

**Tests must be:**
- **Deterministic** — same result every run, no reliance on time.now() or random values
- **Independent** — no test depends on another test's state
- **Fast** — unit tests should run in milliseconds; slow tests don't get run often
- **Self-contained** — no external state required beyond what's in the test

If a test touches the database, use transactions that roll back after each test:
```python
@pytest.fixture(autouse=True)
def db_transaction(db):
    with db.begin_nested():
        yield
    # rolls back automatically
```

---

## Best Practices

1. **Test behavior, not implementation.** Testing private methods reflects design problems, not test problems.
2. **One assertion concept per test.** Multiple `assert` statements on the same concept is fine (e.g., checking the shape of a response object), but not multiple independent assertions.
3. **Tests should be fast.** If a unit test takes more than 100ms, it probably does too much I/O or the setup is too complex.
4. **Keep tests deterministic.** Mock the clock, use fixed seeds for random, control external time.
5. **Use dependency injection** to make code testable without magical framework features.
6. **Run tests in CI** and block merges on test failures. A test that doesn't run in CI is not a test.

---

## Anti-Patterns

- **Testing implementation details** — tests that break on refactoring when behavior is correct
- **Brittle tests** that require exact DOM output or precise string matching for things that don't need it
- **Tests for private methods** — if it's private, it's an implementation detail; test the public behavior that exercises it
- **Commented-out or skipped tests** — either fix them or delete them; forgotten skipped tests hide real failures
- **Over-mocking** — mocking every external call means you're not testing anything real; you need some integration with real components
- **Shared mutable state** between tests — tests that pass individually but fail in Suite are the worst kind

---

## Quality Signals

- Coverage metrics are tracked and reported in CI
- Tests fail fast with clear, actionable error messages
- Integration tests run against real databases in containers (or equivalent test containers)
- E2E tests cover critical user journeys without being brittle
- Test suite runs in CI and blocks merge on failure
- All tests are deterministic and independent
- Mock usage is documented and justified
- Test naming is descriptive enough to understand what failed without reading the test body