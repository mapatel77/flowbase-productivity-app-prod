---
name: "Security Review"
description: "OWASP Top 10 mitigation, input validation, authentication/authorization patterns, secrets management, and vulnerability identification."
phase: "review"
triggers:
  - "security"
  - "owasp"
  - "vulnerability"
  - "xss"
  - "injection"
  - "auth"
  - "secrets"
  - "secure"
dependencies:
  - "testing-tdd"
priority: 2
version: "1.0"
---

## When to Use

Invoke this skill when:
- Before any production deployment, even seemingly trivial changes
- Code handles user authentication or authorization
- Code processes sensitive data — PII, financial, health, credentials
- External security tooling has flagged potential issues
- During architecture design for new features that involve data flows or integrations

**Prerequisite**: `testing-tdd` should be complete — test coverage helps verify security controls.

---

## How to Execute

### Step 1: Map the Attack Surface

For the code under review, identify:

- **What inputs does this code accept?** (user data, file uploads, API parameters, environment variables, cookies, headers)
- **What external services does it call?** (databases, external APIs, file system, message queues)
- **What data does it store or transmit?** (does it touch credentials, PII, financial data?)
- **Who has access?** (is this an authenticated endpoint? Admin-only? Public?)

Document this at the top of your review — it focuses everything that follows.

### Step 2: Check OWASP Top 10

Work through each category systematically:

**A01 — Broken Access Control**
- Can users access resources they shouldn't? (users reading each other's data, admins accessing admin features)
- Are authorization checks performed consistently on every request, server-side?
- Does the code rely only on UI hiding elements rather than server enforcement?
- Can IDOR (Insecure Direct Object Reference) be exploited? (`/orders/123` — can user 456 access order 123?)

**A02 — Cryptographic Failures**
- Is sensitive data properly protected at rest and in transit?
- Are passwords hashed with strong algorithms (bcrypt, argon2, scrypt — not MD5, SHA1, or plain text)?
- Is sensitive data logged (passwords, tokens, PII going to logs)?
- Is encryption used where required (TLS for transport, appropriate algorithms for storage)?

**A03 — Injection**
- Can SQL injection occur? (any string concatenation into SQL queries — always use parameterized queries)
- Can command injection occur? (any `exec`, `system`, `shell` calls with user input — avoid if possible, validate strictly if required)
- Can NoSQL injection occur? (MongoDB and similar — validate input types strictly)
- Can LDAP injection occur? (input validation for LDAP queries)
- Is output encoded properly for context? (HTML encoding for web pages, URL encoding for URLs, etc.)

**A04 — Insecure Design**
- Are there architectural weaknesses — no rate limiting, no brute-force protection, no transaction limits?
- Could race conditions be exploited? (overdrafts, coupon reuse, inventory overselling)
- Is there sufficient anti-automation? (captchas, rate limiting, bot detection for sensitive operations)

**A05 — Security Misconfiguration**
- Are defaults changed from insecure installation settings?
- Are unnecessary features/ports/services disabled?
- Are error messages generic in production (not leaking stack traces, paths, library versions)?
- Is debug mode disabled in production?
- Are security headers set appropriately? (CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security)

**A06 — Vulnerable and Outdated Components**
- Are dependencies up to date? (run `npm audit`, `pip-audit`, OWASP Dependency-Check)
- Are there known CVEs in the versions used?
- Are compounds from untrusted sources being used?

**A07 — Authentication and Identification Failures**
- Can accounts be brute-forced? (is there rate limiting on login? Account lockout? MFA?)
- Are session tokens random, long, and properly expired?
- Are credentials being transmitted securely? (HTTPS only, secure cookie flags)
- Can sessions be hijacked or fixed? (is `httpOnly`, `secure`, `sameSite` set on session cookies?)

**A08 — Software and Data Integrity Failures**
- Can deserialization attacks occur? (never deserialize untrusted data)
- Are software updates signed and verified before installation?
- Is CI/CD pipeline properly secured — can an attacker modify the pipeline to inject malicious code?

**A09 — Security Logging and Monitoring Failures**
- Are authentication events logged? (login success, login failure, password reset)
- Are access control failures logged?
- Are errors logged server-side (not sent to the client)?
- Is there alerting on suspicious patterns? (multiple failed logins, unusual access patterns)

**A10 — Server-Side Request Forgery (SSRF)**
- Can the server be tricked into making requests to internal services? (user-provided URLs not validated)
- Can the server access cloud metadata endpoints? (169.254.169.254 on AWS, GCP, Azure)
- Are URL schemes restricted? (only allow `http` and `https`, block `file://`, `dict://`, etc.)

### Step 3: Validate Input and Output

- **Server-side validation on all inputs** — never trust client-side validation
- **Output encoding** prevents injection: HTML encode for HTML context, JSON encode for JSON context, URL encode for URL parameters
- **File uploads**: validate by magic bytes (not just extension) — a `.jpg` that's actually PHP code is still executable if served as `.php`

### Step 4: Verify Secrets Management

- **No secrets in code** — not in source, not in git history. Use environment variables, secret stores (AWS Secrets Manager, HashiCorp Vault), or configuration files outside version control.
- **Secrets rotated regularly** — are API keys, database passwords, and session secrets rotated?
- **Debug endpoints secured or removed** — `/debug`, `/env`, `/heap` endpoints should not expose sensitive data

### Step 5: Verify Data Handling

- **PII minimized** — do you need to store all the data you're collecting?
- **Sensitive data not logged** — passwords, tokens, full credit card numbers, SSNs should never appear in logs
- **Data in transit** — is TLS enforced? Are internal services communicating over plaintext?
- **Data at rest** — is encryption used where required for compliance?

---

## Best Practices

1. **Principle of least privilege**: request only the permissions actually needed, expose only what's necessary
2. **Defense in depth**: multiple layers of controls — if one fails, others provide protection
3. **Fail securely**: when errors occur, deny access rather than granting it
4. **Keep dependencies updated**: subscribe to security advisories for your dependencies
5. **Have a security incident response plan**: know who to call, how to contain, how to communicate

---

## Anti-Patterns

- **Trusting client-side validation only** — any client-side check can be bypassed
- **Using weak crypto**: MD5/SHA1 for passwords (rainbow tables), DES for encryption (broken), hardcoded keys
- **Storing secrets in code or config files** — code gets committed to git, configs get checked into source
- **Not validating redirects**: open redirect vulnerability — user-supplied URLs in redirects canphish users
- **Skipping security updates**: known CVEs actively exploited — update promptly
- **Ignoring security advisories**: treat security updates as urgent, not optional

---

## Quality Signals

- Security scan (SAST/DAST) passes in CI with no critical findings
- No secrets in code repository — verified with git-secrets or equivalent
- No authentication bypass vulnerabilities in the codebase
- Security events (failed logins, access control failures) are logged and alerted on
- Team has completed security awareness training
- Penetration test or security review has been performed for high-risk changes
- All OWASP Top 10 categories have been reviewed for this change