---
name: "Task Planning"
description: "Breaking work into atomic, testable units with clear priorities, dependencies, and acceptance criteria per unit."
phase: "plan"
triggers:
  - "break down"
  - "task list"
  - "work breakdown"
  - "sprint planning"
  - "estimate"
  - "prioritize"
  - "todo"
dependencies:
  - "requirements-analysis"
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- You have a completed and reviewed spec
- Work needs to be decomposed into implementable chunks
- Preparing for sprint planning or estimation
- Work feels overwhelming and needs structure

**Prerequisite**: `requirements-analysis` should be complete before planning. Do not plan from an incomplete spec.

---

## How to Execute

### Step 1: Inventory All Deliverables

Starting from the spec, list every distinct deliverable:
- Features and user stories
- Bug fixes required (don't ship new features on top of known bugs)
- Technical debt items that must be addressed
- Documentation deliverables
- Testing deliverables (test scripts, test data, CI setup)

Categorize each:
- **Feature** — user-facing capability
- **Bugfix** — correction of broken behavior
- **Tech debt** — refactoring, tooling, infrastructure
- **Docs** — guides, runbooks, API docs

### Step 2: Break Each Deliverable into Tasks

A well-formed task meets these criteria:
- **Completable by one engineer in 0.5–2 days** — if it's larger, split it
- **Has a clear "done" state** — not "mostly finished" but "this is done and tested"
- **Independently testable** — you can verify completion without waiting for other tasks
- **Has a single clear owner** — one person responsible, even in a pair

For each task, write:
1. **What** (description, not implementation)
2. **Why** (link back to which requirement it satisfies)
3. **Acceptance criteria** — not "test it," but concrete checkable outcomes
4. **Estimated size**: S (1-2h), M (3-4h), L (1-2d), XL (2-5d — should be split further)

### Step 3: Identify Dependencies

For each task, ask:
- Does this depend on another task completing first?
- Does another task depend on this completing first?
- Are there any external dependencies? (design review, security sign-off, external API access)

Create a dependency graph mentally. Tasks on the critical path need to start earliest.

**Tip**: Build "glue" tasks explicitly — integration work, PR reviews, documentation, and testing are all real tasks, not assumed间隙.

### Step 4: Sequence the Work

Order tasks respecting dependencies and team availability:
1. **Critical path tasks first** — these block everything else
2. **Then supporting tasks** — tasks that can run in parallel once prerequisites are done
3. **Then final integration and testing** — always leave time at the end
4. **Then docs and handoff** — tasks that depend on implementation being stable

### Step 5: Assign Priority

Prioritize within constraints:

| Priority | Meaning |
|---|---|
| **P0** | Blocking the release — cannot ship without this |
| **P1** | Important, significant user impact — do in this cycle |
| **P2** | Nice-to-have, deferred — track but don't block on |
| **P3** | Exploratory, tech debt — do if time remains |

Priority should reflect **business impact**, not technical elegance. A task that unblocks many users is P0 even if it's mechanically simple.

### Step 6: Flag Risks

For any task with uncertainty, flag it explicitly:
- **Blocked on external dependency** — who owns it, what are the SLA?
- **Uses unfamiliar technology** — add spike time
- **Large uncertainty in scope** — break into spike + implementation
- **Could reveal hidden complexity** — time-box investigation, escalate if exceeded

### Step 7: Produce the Artifact

The output is a task list — digital (Jira, Linear, Notion) or physical (markdown file). Each task should be:
- Titled in plain language
- Linked to the spec it satisfies
- Have acceptance criteria
- Have an owner and priority
- Have a size estimate

---

## Best Practices

1. **Tasks should be independently testable.** If you can't verify a task is done without another task also being complete, split it.
2. **Include "invisible" tasks**: code review time, documentation, setting up dev environments, database migrations. Don't plan only implementation time.
3. **Estimate in ranges, not points.** "3-4h" beats "4h" — it captures uncertainty honestly.
4. **Every task needs acceptance criteria**, not just a description. "Build the login form" is not a task — "Login form with email/password fields validates empty fields with inline error messages, succeeds on valid credentials, and redirects to /dashboard" is a task.
5. **Revisit the plan as work progresses.** Plans are hypotheses. Update them when reality diverges significantly.
6. **Buffer time for code review and integration** — typically 20-30% on top of pure implementation time.

---

## Anti-Patterns

- **Week-long tasks.** Anything larger than 2 days is almost certainly two or more tasks. Split it.
- **Skipping small-seeming tasks**: environment setup, configuring linting, writing a README — these are real work and take real time.
- **Not accounting for cross-functional dependencies**: design review, security sign-off, platform team capacity, QA availability.
- **Planning far-ahead phases in detail.** Don't plan the Test phase in week 1 of the Define phase. Plan in appropriate granularity for the current phase.
- **Treating estimates as commitments.** Estimates are hypotheses. Add margin. Communicate ranges.

---

## Quality Signals

- Every task has a clear owner and acceptance criteria
- Dependency graph identifies the critical path
- Priority reflects business impact
- Risky tasks are explicitly flagged with mitigation plans
- The team can commit to the plan with confidence — not hope
- No task is larger than 2 days; larger items are split
- "Invisible" tasks (code review, docs, migrations) are included