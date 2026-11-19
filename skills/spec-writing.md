---
name: "Spec Writing"
description: "Authoring comprehensive SPEC.md files with acceptance criteria, context, and clear definitions of done."
phase: "define"
triggers:
  - "write SPEC"
  - "create specification"
  - "define scope"
  - "SPEC.md"
  - "spec document"
  - "spec"
dependencies: []
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- Starting a new feature with unclear scope
- Fixing a bug where requirements are ambiguous
- Onboarding to a project and needing to establish shared understanding
- Before writing any code whatsoever

**Do not** start coding without a spec. A moment of spec-writing saves an hour of rewriting.

---

## How to Execute

### Step 1: Identify the Problem

Start with a single sentence: *"This spec addresses **[problem X]** for **[user Y]**."*

Write this at the top of the document. If you cannot articulate the problem in one sentence, you do not yet understand the work well enough to spec it.

### Step 2: Define Scope

Create two explicit lists:

**In Scope** — what this project includes. Be specific, not aspirational.

**Out of Scope** — explicitly what this project does NOT include. This is the most commonly skipped step and causes the most scope creep. Do not skip it.

### Step 3: Write User Stories

Format each as:

```
As a [role], I want [outcome] so that [benefit].
```

Prefer **INVEST** properties:
- **I**ndependent — stories can be implemented in any order
- **N**egotiable — scope can be adjusted
- **V**aluable — delivers user value, not just technical activity
- **E**stimable — you have enough info to size it
- **S**mall — completable in under 2 days
- **T**estable — you can verify acceptance criteria

### Step 4: Define Acceptance Criteria per User Story

For each user story, write concrete, testable acceptance criteria. Each criterion should be:
- A statement of outcome, not implementation
- Demonstrably verifiable
- Written in plain language any stakeholder can understand

**Bad**: "The button should look nice"
**Good**: "The submit button displays a loading spinner during the API call and reverts to its original label within 2 seconds of the call completing or failing"

### Step 5: Document Technical Constraints

- Performance budgets (e.g., "response time under 200ms at p95")
- Browser or device support requirements
- External service dependencies or rate limits
- Security or compliance requirements already known
- Compatibility constraints (API versioning, data formats)

### Step 6: Define Success Metrics

Write down how you will know this feature works well in production. Define at least one quantitative metric.

**Example**: "Page load time improves from 4.2s to under 2s, measured at p75 on mobile 4G."

### Step 7: Review and Refine

- Ask a peer: "Can you implement this spec without asking me any questions?"
- If they can, the spec is good. If they can't, identify the gap and fill it.
- Check that acceptance criteria don't contradict each other.
- Mark any areas of uncertainty explicitly: `[UNRESOLVED: do we need to support IE11?]`

---

## Best Practices

1. **One spec per feature or coherent change group.** Do not lump unrelated work into one document.
2. **Version the spec with the code.** If the spec changes, update it and note the change.
3. **Keep specs short but complete.**prefer 1-3 pages. If a spec grows beyond 10 pages, split it.
4. **Include visual mockups for UI work.** A picture eliminates more ambiguity than paragraphs of prose.
5. **Spec the happy path AND the main failure paths.** Don't spec only "what happens when everything works."
6. **Use consistent terminology.** Define terms once; reuse them. Ambiguous vocabulary creates inconsistent implementations.

---

## Anti-Patterns

- **Specifying implementation instead of outcomes.** "The app shall use a Redis cache" is not a requirement — it's a solution. State what you need ("page loads in under 100ms"), not how to achieve it.
- **"Handle errors gracefully."** What does that mean? State what the user sees, what they can do, and what data is preserved.
- **Over-specifying.** If you find yourself describing control flow or function signatures, you've crossed from "what" into "how." Stop.
- **Missing out-of-scope.** Without explicit boundaries, every conversation expands scope. Write them even if they feel obvious.
- **Acceptance criteria that require running the code to verify.** If you can't write a test for it, it's not an acceptance criterion.

---

## Quality Signals

- A new engineer can read the spec and start implementing without clarifying questions
- Every acceptance criterion maps to at least one testable outcome
- Scope boundaries are explicit and non-contradictory
- The problem statement is one clear sentence
- At least one success metric is defined and measurable
- No requirement contradicts another section of the spec
- Peer review has been done and gaps filled