---
name: "Architecture Design"
description: "System-level design including component boundaries, data models, API contracts, and scalability considerations."
phase: "plan"
triggers:
  - "architecture"
  - "system design"
  - "data model"
  - "api contract"
  - "component design"
  - "high-level design"
  - "HLD"
dependencies:
  - "task-planning"
priority: 2
version: "1.0"
---

## When to Use

Invoke this skill when:
- Building a new system from scratch
- Making significant architectural changes to an existing system
- Technical decisions will be expensive to reverse later
- You need to document design rationale for future maintainers
- Starting work that involves multiple components or services

**Prerequisite**: `task-planning` must be complete first. You need the task breakdown to understand the scope of what architecture must support.

---

## How to Execute

### Step 1: Ground in Non-Functional Requirements

Before drawing any diagrams, re-read the non-functional requirements from `requirements-analysis`:
- What scale must the system handle? (concurrent users, data volume, throughput)
- What availability is required? (SLA, maintenance windows)
- What are the data integrity requirements? (consistency model, backup needs)
- What security posture is required? (data classification, compliance)

These constraints drive every architectural decision. If you don't know them, stop and find out.

### Step 2: Define Bounded Contexts and Component Boundaries

Identify natural seams in the system:

**Questions to ask:**
- What domain entities does this system manage?
- Where are the natural ownership boundaries?
- What does each component know and own?
- What are the interfaces between components?
- Where does data flow, and in what direction?

**Approach:** Start with a rough component diagram. Name each component, describe its responsibility in one sentence, and identify who/what it communicates with.

Prefer fewer, larger components over many small ones for new systems — you can always split later, but merging small components is harder.

### Step 3: Design the API Surface

For each component that exposes an interface:

- **What are the primary operations?** (Commands and queries)
- **What are the event contracts?** (What does this component emit that others might care about?)
- **What data flows across component boundaries?**
- **Is this API synchronous or asynchronous?**

Decide on API style (REST, GraphQL, gRPC, message queues) based on the use case:
- REST: good for CRUD, simple resource models
- GraphQL: good when clients need flexible data shapes
- gRPC: good for high-performance service-to-service
- Message queues: good for async, eventually-consistent workflows

### Step 4: Make Foundational Decisions

These decisions are expensive to reverse — make them explicitly and document the rationale:

| Decision | Options | Considerations |
|---|---|---|
| Database type | Relational, Document, Key-Value, Time-Series | Query patterns, consistency needs, data structure |
| Deployment model | Monolith, Modular Monolith, Microservices, Serverless | Team size, scale needs, operational maturity |
| Authentication | JWT, Sessions, OAuth, API keys | Stateless vs stateful, refresh strategy, security needs |
| Caching strategy | None, Local, Distributed | Read/write ratio, consistency requirements |

### Step 5: Design Data Models

For each major entity:
- What are the core attributes?
- What relationships exist to other entities?
- Are there any invariants that must be maintained at the database level?
- What indexes are needed for common query patterns?
- Is soft-delete appropriate vs. hard-delete?

### Step 6: Address Cross-Cutting Concerns

For each, document the approach:

- **Observability**: logging (what, what level, what context?), metrics (what's measured and why?), tracing (how to follow a request across components?)
- **Error handling**: what's the error propagation strategy? Are errors retried?
- **Security perimeter**: how is the system protected from unauthorized access? What is trusted vs. untrusted?
- **Config management**: where does configuration come from? How is it rotated?

### Step 7: Create Supporting Artifacts

Draw enough diagrams to communicate the design:
- **Component diagram**: what components exist and how they interact
- **Data flow diagram**: how data moves through the system
- **Sequence diagram**: for critical operations, step-by-step component interactions

Diagrams are communication tools. A simple diagram that communicates clearly beats a complex diagram that's technically accurate but unreadable.

---

## Best Practices

1. **Make decisions explicit and record the rationale.** Future engineers (including yourself) will thank you. "Chose PostgreSQL because we needed relational integrity and complex joins" beats no explanation.
2. **Prefer simpler designs that can evolve** over complex designs that predict future requirements.
3. **Consider operational complexity:** monitoring, deployment, debugging — these cost real time in production.
4. **Design for failure:** what happens when components fail? Can the system degrade gracefully?
5. **Keep domain models pure**: let infrastructure concerns be injected, not baked into business logic.
6. **Document data ownership**: what component is the authoritative source for each piece of data?

---

## Anti-Patterns

- **Over-engineering for hypothetical scale.** Build for today's scale with clear migration paths, not tomorrow's hypothetical millions.
- **Ignoring vendor lock-in.** What happens when the managed service you chose raises prices 10x?
- **Designing only the happy path.** Failure scenarios reveal architectural weaknesses that happy-path design hides.
- **Centralizing logic in "god components."** If one component knows everything and does everything, it's an architectural problem.
- **Neglecting data migration paths.** Schema changes to production systems need migration plans, not just new schemas.

---

## Quality Signals

- The design can be explained in a single README with supporting diagrams
- Each component has a clearly defined responsibility and public interface
- Data ownership is explicit — it's clear what component is the source of truth for each entity
- Operational concerns (monitoring, error handling, security) are addressed, not an afterthought
- The architecture has been reviewed by at least one person with different expertise
- Key decisions and their rationale are documented
- There is a clear migration or evolution path for each "big bet" decision
- Failure scenarios have been considered and addressed