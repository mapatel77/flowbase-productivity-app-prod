---
name: "Requirements Analysis"
description: "Deep analysis of user needs including edge cases, non-functional requirements, constraints, and implicit assumptions."
phase: "define"
triggers:
  - "analyze requirements"
  - "edge cases"
  - "non-functional"
  - "user needs"
  - "constraints"
  - "NFR"
  - "assumptions"
dependencies:
  - "spec-writing"
priority: 2
version: "1.0"
---

## When to Use

Invoke this skill when:
- SPEC.md exists but feels incomplete or shallow
- Before estimating or committing to a timeline (to avoid surprise scope)
- When edge cases keep producing bug reports
- For any feature with multiple user interaction paths, external integrations, or data flows

**Prerequisite**: `spec-writing` must be completed first — this skill operates on a completed spec.

---

## How to Execute

### Step 1: Enumerate User Roles

List every distinct role that interacts with the system. Include:
- Primary users (the people doing the main job)
- Secondary users (people impacted but not directly using the feature)
- Admin/operations roles
- External systems or APIs

For each role, document what they're trying to accomplish and their technical sophistication.

### Step 2: Map the Happy Path

Document step-by-step what "success" looks like for each primary user story:
- What does the user do first, second, third?
- What does the system do in response?
- What does the user see at each step?
- What does success look like at the end?

### Step 3: Enumerate Failure Paths

For each step in the happy path, ask: "What can go wrong here?"

Failure categories to consider:
- **User errors**: invalid input, wrong action, misunderstood UI
- **System errors**: service unavailable, timeout, data corruption
- **Environmental**: network interruption, device failure, session expiry
- **Concurrency**: race conditions, double-submit, out-of-order events

Document how the system responds to each failure — specifically what the user experiences.

### Step 4: Analyze Edge Cases

An edge case is an unusual but valid input or situation. For each functional requirement:

- What happens at boundary values? (empty, zero, maximum, negative)
- What happens with unusual but valid characters, formats, or sizes?
- What happens when things occur simultaneously?
- What happens with rapid repeated actions (double-click, rapid form submission)?

Categorize each edge case by:
- **Likelihood**: common / uncommon / rare
- **Severity**: cosmetic / workaround-OK / data-loss / security risk
- **Handling**: already covered / needs new handling / acceptable to defer

### Step 5: Elicit Non-Functional Requirements (NFRs)

For each category, get specific numbers, not adjectives:

**Performance**
- Response time targets (mean, p95, p99)
- Throughput requirements (users/concurrent requests)
- Resource budgets (memory, CPU, disk)

**Scalability**
- Expected user count now and in 12 months
- Data volume growth rate
- Peak load scenarios

**Availability**
- Uptime SLA (e.g., 99.9% = 8.7h downtime/year)
- Maintenance windows
- Dependency on external services and their SLAs

**Security**
- Data classification (public, internal, confidential, restricted)
- Compliance requirements (GDPR, HIPAA, SOC2, PCI)
- Authentication and authorization requirements

**Accessibility**
- WCAG level required (A, AA, AAA)
- Device/browser support matrix

### Step 6: Document All Assumptions

Write down every assumption being made:
- "API rate limit of 100 req/s is sufficient"
- "Users will upload images no larger than 10MB"
- "Session timeout of 30 minutes is acceptable"

For each assumption, record:
- **Confidence**: confirmed / likely / uncertain
- **Risk if wrong**: low / medium / high
- **How to validate**: test plan, user research, spike

### Step 7: Challenge the Must-Haves

Go through every item marked "must have" and ask:
- What happens if we don't do this in v1?
- Can we ship a simpler version and iterate?
- Is this truly blocking user value, or just nice-to-have?

Resist the pressure to over-engineer. Every requirement has a cost.

---

## Best Practices

1. **Ask "what else could go wrong?"** at every step. The first answer is rarely the complete answer.
2. **Consider the full data lifecycle**: creation, updates, reads, deletes, archival, export.
3. **For APIs: document all error codes and response shapes**, not just the success case.
4. **Include internationalization from the start**: character encoding, text expansion, RTL layouts, date/time/number formats.
5. **Think about GDPR/HIPAA implications early**: data minimization, consent, retention, deletion.
6. **Don't accept vague requirements**: "secure," "fast," "scalable" — these are not requirements without numbers.

---

## Anti-Patterns

- **Accepting the first spec draft as complete.** First drafts are never complete. Ask why.
- **Ignoring requirements that seem "obvious."** "Obvious" requirements are the ones most frequently missed.
- **Collecting requirements from only one stakeholder.** Different people have different needs and hidden assumptions.
- **Skipping operational requirements**: logging, monitoring, debugging trails, and on-call runbooks.
- **Accepting "handle errors gracefully" as an edge case definition.** Graceful is not a specification.
- **Failing to prioritize edge cases.** Not all edge cases need handling in v1 — but you must know which are which.

---

## Quality Signals

- At least 3 edge cases documented per functional requirement
- Non-functional requirements have specific, measurable targets — not adjectives
- Every assumption is recorded with a confidence level
- Edge cases are categorized by likelihood, severity, and whether they're handled
- Compliance requirements are documented and assigned to specific tasks
- The "must have" list has been interrogated and is genuinely minimal
- Operational requirements (logging, monitoring) are included