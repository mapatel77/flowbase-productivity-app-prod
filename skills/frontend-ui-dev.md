---
name: "Frontend UI Development"
description: "Component architecture, accessibility (WCAG 2.1 AA), responsive design, state management, and performance."
phase: "build"
triggers:
  - "frontend"
  - "ui component"
  - "react"
  - "vue"
  - "svelte"
  - "accessibility"
  - "responsive"
  - "wcag"
  - "css"
  - "jsx"
  - "tsx"
dependencies:
  - "architecture-design"
priority: 1
version: "1.0"
---

## When to Use

Invoke this skill when:
- Building or modifying user-facing components
- Working with React, Vue, Svelte, or similar component frameworks
- Implementing new UI features, interactions, or pages
- Fixing accessibility or responsiveness issues

**Prerequisite**: `architecture-design` should provide component boundaries to work within or confirm.

---

## How to Execute

### Step 1: Identify Component Scope and API

Before writing markup, understand:

- **What props does this component accept?** (Type them if using TypeScript)
- **What state does it manage internally?** (Keep this minimal)
- **What events does it emit?** (onClick, onChange, onSubmit — follow framework conventions)
- **What is the component lifecycle?** (mount, update, unmount concerns)
- **Where does it sit in the component tree?** (Is it a leaf component or a container?)

Design the component's public API first — inputs and outputs — before thinking about implementation.

### Step 2: Build Accessible Markup

Start semantic, not styled:

- Use `<button>` for actions, not `<div>` or `<span>` with click handlers
- Use `<nav>` for navigation regions, `<main>` for primary content, `<aside>` for secondary
- Use `<form>` with associated `<label>` elements — never bare `<input>` with a placeholder as the only label
- Use `<table>` for tabular data, not CSS grids mimicking tables
- Use `<ul>/<li>` for lists, `<article>` for articles, `<section>` with explicit headings for sections

**Keyboard navigation**: Every interactive element must be reachable by Tab and activated by Enter/Space. Test the tab order — the DOM order is the accessibility order.

### Step 3: Add ARIA Where Semantic HTML Falls Short

ARIA (Accessible Rich Internet Applications) fills gaps where HTML semantics are insufficient:

- `aria-label="Submit form"` on a button that only has an icon
- `aria-expanded`, `aria-controls` for collapsible regions
- `aria-live="polite"` for dynamic content updates that should be announced
- `aria-describedby` to associate a field with its error message
- `role="alert"` for inline error messages

**Rule of thumb**: If you find yourself using `role=""` to override native semantics, reconsider the element choice first.

### Step 4: Implement Styling

Use a mobile-first responsive approach:

1. **Write base styles for smallest viewport** — mobile, no media query
2. **Add progressive enhancements** at breakpoints with `min-width` media queries
3. **Use relative units** (`rem`, `em`) over `px` for typography and spacing
4. **Use CSS custom properties** for theming — never hardcode color values in component code
5. **No `!important`** except in utility classes with explicit purpose
6. **Component-scoped styles** where the framework supports it

For layout: prefer Flexbox and Grid over float-based layouts. Use logical properties (`margin-block-start` vs. `margin-top`) for RTL compatibility.

### Step 5: Implement Component Logic

- **Separation of concerns**: presentational components handle only UI; container components handle data and events
- **Unidirectional data flow**: props flow down, events flow up — never mutate props
- **Side effects**: API calls, subscriptions, event listeners — use appropriate lifecycle hooks or effects
- **Loading and error states**: always handle the loading, empty, and error states explicitly — not just the happy path
- **Animations**: respect `prefers-reduced-motion` — wrap animations in a check and provide a no-motion alternative

### Step 6: Validate

- Run the component through `axe-core` or browser accessibility audit
- Navigate the component with keyboard only — no mouse
- Verify color contrast meets WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text)
- Test at various zoom levels (200%) — does the layout break?
- Verify all images have appropriate `alt` text (or `alt=""` for decorative images)
- Test with a screen reader (NVDA on Windows, VoiceOver on Mac) if available

---

## Best Practices

1. **Name components after their purpose, not their appearance.** `UserProfileCard` beats `BlueBoxWithBorder`. Appearance names become misleading when design changes.
2. **Export both the component and its prop types** for TypeScript consumers.
3. **Use controlled components for form inputs** — the component owns the state and drives the validation.
4. **Keep components small and single-purpose.** If a component needs "and" in its name, it's probably two components.
5. **Write accessible error messages** — tell users what went wrong and what to do about it, not just "Invalid input."
6. **Use `aria-invalid` and `aria-describedby` together** on fields with validation errors.

---

## Anti-Patterns

- `<div onClick={...}>` when `<button>` is the right element — buttons get keyboard and accessibility support for free
- Missing `alt` text on content images — screen readers read `src` as the description instead
- `aria-label` that duplicates visible text — can create confusion when screen readers announce both
- `display: none` to hide content from screen readers — use `visually-hidden` CSS or `aria-hidden="true"` (only when truly hidden from everyone)
- Fixing accessibility with `outline: none` without providing an alternative focus indicator
- Ignoring `prefers-reduced-motion` — some users experience motion sickness from animations

---

## Quality Signals

- Lighthouse accessibility score ≥ 90 in the target framework's audit tool
- Semantic HTML is used throughout — no meaningless `<div>` structures
- All interactive elements are keyboard accessible with visible focus indicators
- Color contrast passes WCAG 2.1 AA for all text and interactive elements
- Screen reader testing has been performed or explicitly planned
- Component API is self-documenting through prop names and TypeScript types
- Loading, empty, and error states are handled explicitly
- `prefers-reduced-motion` is respected for animations