---
name: "Deployment & Handoff"
description: "Release process, rollback planning, monitoring setup, documentation, and cross-team communication."
phase: "ship"
triggers:
  - "deploy"
  - "release"
  - "handoff"
  - "rollback"
  - "monitoring"
  - "documentation"
  - "production"
  - "cd"
  - "ci cd"
dependencies:
  - "code-review"
  - "security-review"
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- Preparing for production deployment
- Creating release documentation
- Handing off to another team or environment
- Planning a rollback strategy
- Setting up production monitoring for new services

**Prerequisites**: Both `code-review` and `security-review` must be complete and approved. Roll not proceed without security sign-off.

---

## How to Execute

### Step 1: Prepare Release Artifacts

- **Version all deployable units consistently** — the artifact should be traceable to a specific commit, build, and timestamp. "Latest" is not a version.
- **Build artifacts should be reproducible** — the same commit should produce the same binary. Use lockfiles (package-lock.json, Pipfile.lock) and build from the same commit.
- **Generate checksums** for artifact verification — SHA-256 checksums of artifacts let operators verify integrity before deployment.
- **Tag releases in version control** — annotated tags with changelogs make rollbacks precise.
- **Ensure all configuration is externalized** — no hardcoded credentials, no environment-specific URLs baked into binaries.

### Step 2: Create and Update Documentation

- **Update README** — any new environment variables, new external dependencies, changed behaviors or API contracts
- **Document known limitations and issues** — if the current release has a workaround for a known bug, document it and link to the tracking ticket
- **Update API documentation** if contracts changed — if the API interface changed, both the consumer and provider docs need to be updated
- **Write or update runbooks** — step-by-step operational procedures for common tasks (restart, scale, troubleshoot)
- **Document new alerts** — if new metrics are being tracked, document what they mean and what action to take

### Step 3: Plan the Deployment

Choose an approach appropriate to the risk and impact:

| Strategy | When to use |
|---|---|
| **Blue-green** | Full replacement — new version side-by-side with old, traffic switches when new looks healthy |
| **Canary** | Gradual rollout — send X% of traffic to new version, monitor, increase |
| **Rolling** | Incremental — pods/instances update one at a time, always some capacity running |
| **Feature flags** | New features behind flags — deploy code in a disabled state, enable per-user |

**Additional considerations**:
- Schedule around low-traffic windows if the change is risky
- Coordinate with dependent teams if there are cross-service implications
- Inform on-call engineers and ensure they're available during rollout
- If database migrations are involved: migrations in the same deploy must be backward-compatible (old code works on new schema). Plan the migration sequence carefully.

### Step 4: Establish a Rollback Plan

Document before deploying:
- **How to roll back each component** — version to revert to, which artifacts, which commands to run
- **Verify rollback doesn't cause data loss** — rolling back application code is usually safe; rolling back database migrations requires careful planning
- **Test rollback procedure** in staging — if you haven't practiced rolling back, you don't know if rollback works
- **Define automatic rollback triggers** — error rate spikes, latency degradation, health check failures
- **Set a threshold** for when to rollback vs. investigate — don't let a bad deploy run for an hour before acting

### Step 5: Set Up Monitoring and Observability

Deploy these before or simultaneously with the application:

- **Health endpoints**: deploy `/health/live` and `/health/ready` immediately. They should work from the first deployed version.
- **Configure alerts**: set thresholds for error rates (5xx > 1% for 5 minutes), latency (p95 > 2s), resource usage (CPU > 80%, memory > 85%)
- **Validate dashboards**: confirm new metrics are flowing to the monitoring system before declaring success
- **Ensure logs are centralized**: application logs must flow to the central log aggregation system, not stay on local disk

### Step 6: Communicate

- **Notify stakeholders of deployment timeline** — especially for changes to shared services, APIs, or infrastructure
- **Post to relevant communication channels** during deployment — so observers can watch for issues
- **Have on-call resources available** during rollout and immediately after — someone needs to be ready to act on alerts
- **Document completion**: when deployment is done, note the artifact version deployed, time, any issues encountered, and who performed it

### Step 7: Conduct a Post-Deployment Review

- Schedule within 1 week of deployment
- Review: What went well? What would you do differently? Were monitoring thresholds appropriate?
- Capture operational learning — update runbooks if gaps were found
- Note any follow-up work discovered during deployment for future iterations

---

## Best Practices

1. **Automate as much as possible** — manual deployment steps don't scale and have human error potential
2. **Deploy small increments frequently** — small changes are easier to verify and rollback. Big bang deployments are high risk.
3. **Monitor immediately after deployment** — don't deploy and walk away. Watch metrics for at least 30 minutes.
4. **Keep staging environment as close to production as possible** — configuration drift between staging and production is a root cause of deployment failures
5. **Have a clear definition of "deployment success"** — defined metrics, thresholds, and acceptance criteria before starting

---

## Anti-Patterns

- **Manual deployment with no rollback plan** — if it goes wrong and you can't roll back, you're stuck
- **Deploying Friday afternoon** — if something goes wrong, you'll be debugging on the weekend
- **No monitoring during rollout** — deploying without eyes is flying blind
- **Not communicating deployment to stakeholders** — teams depending on your service need to know to expect changes
- **Skipping documentation "for now"** — documentation debt accumulates and becomes un-payable under pressure
- **Assuming rollback will work** without testing it — untested rollback is not a rollback plan, it's a hope

---

## Quality Signals

- Deployment can be completed in under 30 minutes by a trained operator following the documented procedure
- Rollback can be executed in under 10 minutes, and has been tested
- All stakeholders know the deployment schedule and their role
- Monitoring catches issues within 5 minutes of occurrence
- No data loss occurs on rollback — verified
- Health and readiness endpoints return accurate status
- Post-deployment review is scheduled within 1 week
- All documentation is updated and accurate