---
name: "Code Review"
description: "Systematic code inspection focusing on correctness, maintainability, readability, and knowledge sharing."
phase: "review"
triggers:
  - "code review"
  - "review changes"
  - "pull request"
  - "pr review"
  - "scrutinize"
dependencies:
  - "testing-tdd"
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- Reviewing a pull request or merge request
- Pair programming and reviewing each other's work
- Self-reviewing your own diff before requesting review
- Conducting code inspections or architecture reviews

**Prerequisite**: `testing-tdd` should be in place — tests are part of what is reviewed.

---

## How to Execute

### Step 1: Understand the Context Before Reviewing

Never review code in isolation. Read:
- The associated issue or ticket — what is this trying to solve?
- The PR description — why was it done this way?
- The existing tests — what testing approach was taken?
- Any related architectural decisions — don't re-litigate settled decisions

If you don't understand the context, ask before reviewing. Misunderstanding the problem leads to wrong feedback.

### Step 2: Review for Correctness

- Does the code do what the PR description claims?
- Are edge cases handled? (empty input, null values, concurrent requests, high load)
- Are there obvious bugs — null pointer dereferences, off-by-one errors, race conditions?
- Does the code handle errors appropriately — does it fail loudly or silently?
- Are there security implications the author may have missed?

Verify behavior against the acceptance criteria. If acceptance criteria are vague, say so and ask for clarification.

### Step 3: Review for Maintainability

- Is the code readable — could a new engineer understand it without asking questions?
- Are functions and classes appropriately sized? Functions over 50 lines are usually doing too much.
- Is there appropriate abstraction — repeated code should be extracted, not duplicated?
- Are names descriptive? (`calculate_order_total` beats `calc`; `pending_orders` beats `orders2`)
- Is there appropriate separation of concerns? Business logic should not live in controllers or templates.
- Would you be comfortable maintaining this code in production at 3am?

### Step 4: Review for Security (see also: `security-review` skill)

- Is user input validated before use?
- Are there potential injection vulnerabilities — SQL, command, or code injection vectors?
- Are secrets handled appropriately — never in code or logs?
- Is authentication and authorization being enforced server-side, not just in the UI?

### Step 5: Review for Performance

- Are there obvious N+1 query patterns — loading a list then fetching each related item separately?
- Are expensive operations repeated unnecessarily — the same computation in a loop instead of precomputed?
- Is pagination used for large result sets — no unbounded `SELECT *` returning thousands of rows?
- Are connections and resources properly cleaned up — no leaked database connections or file handles?

### Step 6: Provide Constructive Feedback

**Prefix comments with severity** to clarify intent:

- `blocking:` or `must-fix:` — this must be addressed before merge. If you leave a blocking comment on style, you're being a bad reviewer.
- `suggestion:` — an improvement, not a requirement. Explain the trade-off.
- `nit:` — minor style, formatting, naming. Use these sparingly.
- `question:` — you don't understand something, not necessarily a problem.
- `praise:` — acknowledge something done well. Review isn't only criticism.

**Format feedback well:**
- Explain *why* something is a problem, not just *what* the problem is
- Offer alternatives — don't just say "this is wrong," say "this could cause X; consider Y instead"
- Be specific: "this function is 120 lines, consider splitting it" beats "this function is too long"
- Acknowledge good work — if the solution is elegant or handles a tricky edge case well, say so

**Example comments:**
- `nit: this could be a one-liner with dict.get(key, default) — but won't block on it`
- `suggestion: the retry logic here has no max attempts, which could cause infinite loops under certain failure modes. Consider adding attempt counting.`
- `question: why is this not using the existing UserService? Is there a reason for the duplication?`
- `blocking: this SQL query is vulnerable to injection — user_id must be parameterized, not string-interpolated.`

### Step 7: Make a Decision

- **Approve** if the work is good as-is or has only minor nits
- **Request changes** if there are blocking issues — not all blocking issues require re-review if you trust the author to fix correctly
- **Comment** for informational or learning items that are not blocking

Respond to all comments, even just "acknowledged" or "done." Silence after review is impolite and leaves the author unsure of status.

---

## Best Practices

1. **Review within 24 hours** — context switches are expensive; long review windows kill team flow.
2. **Respond to all comments** — even "acknowledged, will fix" lets the author know you saw their response.
3. **Don't bikeshed on style** — use linters to enforce style; use review time for things linters can't catch.
4. **Focus on blocking issues, not exhaustive perfection** — if everything is a must-fix, nothing is.
5. **Be kind** — code review is about the code, not the person. Critique the code, not the author.
6. **Own your feedback** — use "I" statements ("I couldn't follow the logic here") not "you" accusatory statements.
7. **Don't review more than 400 lines of code at once** — beyond that, review quality drops dramatically.

---

## Anti-Patterns

- **Approving code you didn't actually read** — the PR is your responsibility once you approve it
- **Vague comments** like "this looks wrong" with no explanation of what or why
- **Making subjective preferences blocking issues** — "I'd have done it this way" is not a blocking comment if the code works
- **Not reviewing your own diff before requesting review** — asking others to find your typos is expensive
- **Nitpicking style** that a linter should catch — save your comments for things that actually matter
- **Approving to be nice** when there are real issues — approve when it's good, not when you want to be liked

---

## Quality Signals

- All blocking issues are addressed before merge
- PRs typically converge in 1-2 review rounds, not 5+
- Review comments are constructive and specific, not vague or personal
- Knowledge is transferred through the review process — both parties learn something
- No obvious bugs reach production because a reviewer caught them
- Style issues are not blocking — they are caught by automated linting
- Review comments receive responses, no comment threading is left dangling