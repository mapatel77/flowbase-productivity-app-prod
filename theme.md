# Flowbase — Cozy UI Theme

The design language for Flowbase, a Notion-meets-Miro productivity studio. The goal is a
workspace that feels **warm, fresh and crafted** — bright cream paper instead of cold grey,
rounded geometry instead of sharp corners, and colourful accents that keep every tool
recognisable at a glance.

The palette pairs a **vivid coral** primary with a **fresh mint** accent over a bright warm
cream canvas: energising without losing the cosy, handmade feel.

---

## 1. Colour palette

All tokens are defined in `app/globals.css` as `oklch()` values and exposed through the
shadcn/Tailwind v4 theme, so use the semantic utilities (`bg-background`, `text-muted-foreground`,
`ring-border`, …) rather than raw colours.

### Core surfaces

| Token | Light | Dark | Use it for |
| --- | --- | --- | --- |
| `--background` | `oklch(0.992 0.014 96)` | `oklch(0.235 0.018 58)` | App canvas — bright warm cream |
| `--card` | `oklch(1 0 0)` | `oklch(0.275 0.02 58)` | Raised surfaces, cards, tiles |
| `--popover` | `oklch(1 0 0)` | `oklch(0.285 0.02 58)` | Menus, tooltips, dialogs |
| `--muted` | `oklch(0.968 0.016 96)` | `oklch(0.32 0.022 70)` | Subtle fills, hover states |
| `--accent` | `oklch(0.955 0.038 162)` | `oklch(0.35 0.045 165)` | Fresh mint — hover / selected states |

### Text

| Token | Light | Dark | Use it for |
| --- | --- | --- | --- |
| `--foreground` | `oklch(0.29 0.028 58)` | `oklch(0.95 0.015 96)` | Primary text — warm espresso, not black |
| `--muted-foreground` | `oklch(0.525 0.028 65)` | `oklch(0.72 0.025 85)` | Secondary text, captions, metadata |
| `--secondary-foreground` | `oklch(0.34 0.045 55)` | `oklch(0.95 0.015 96)` | Text on secondary fills |

### Brand & lines

| Token | Light | Dark | Use it for |
| --- | --- | --- | --- |
| `--primary` | `oklch(0.655 0.185 33)` | `oklch(0.72 0.17 38)` | Vivid coral — primary buttons, active nav |
| `--primary-foreground` | `oklch(0.995 0.012 95)` | `oklch(0.22 0.03 45)` | Text on coral |
| `--border` | `oklch(0.915 0.018 90)` | `oklch(1 0 0 / 10%)` | Hairlines, dividers, card rings |
| `--ring` | `oklch(0.72 0.15 38)` | `oklch(0.65 0.14 38)` | Focus rings |
| `--destructive` | `oklch(0.577 0.225 27)` | `oklch(0.704 0.191 22.216)` | Delete / destructive actions |

### Sidebar

| Token | Light | Dark |
| --- | --- | --- |
| `--sidebar` | `oklch(0.985 0.016 96)` | `oklch(0.255 0.019 58)` |
| `--sidebar-accent` | `oklch(0.945 0.045 55)` | `oklch(0.34 0.045 55)` |
| `--sidebar-accent-foreground` | `oklch(0.35 0.06 45)` | `oklch(0.95 0.015 96)` |
| `--sidebar-border` | `oklch(0.915 0.018 92)` | `oklch(1 0 0 / 10%)` |

### Colourful icon map

Every sidebar destination owns a hue so the rail reads like a row of coloured tools.
Keep the icon hue, but let the surface stay neutral.

| Destination | Icon | Colour |
| --- | --- | --- |
| Dashboard | `LayoutDashboard` | `text-orange-500` |
| AI Assistant | `Sparkles` | `text-violet-500` |
| Calendar | `CalendarDays` | `text-rose-500` |
| Task / Kanban | `SquareKanban` | `text-sky-500` |
| Notes | `NotebookPen` | `text-amber-500` |
| Whiteboard | `Presentation` | `text-emerald-500` |
| Pages / Spaces | `Layers` | `text-indigo-500` |
| AI Template Builder | `WandSparkles` | `text-fuchsia-500` |
| Settings | `Settings` | `text-slate-500` |

The same map lives in `lib/navigation.ts` (`iconClassName`) — change it there, not in the
components.

---

## 2. Typography

- **Body / UI — Nunito** (`--font-nunito`). Rounded, friendly, highly legible at small sizes.
  Loaded through `next/font/google` in `app/layout.tsx`.
- **Headings — Fraunces** (`--font-fraunces`). A soft serif for page titles, card titles and
  the app wordmark. Use via the `font-heading` utility.
- **Fallback stacks:** `ui-rounded, "Segoe UI Variable", system-ui, sans-serif` and
  `Georgia, serif` so the app still looks right if web fonts fail to load.

```tsx
<h1 className="font-heading text-2xl font-semibold tracking-tight">Today&apos;s focus</h1>
<p className="text-sm text-muted-foreground">Supporting copy stays quiet and warm.</p>
```

Scale:

| Role | Classes |
| --- | --- |
| Page title | `font-heading text-2xl font-semibold tracking-tight md:text-[28px]` |
| Section title | `font-heading text-base font-semibold tracking-tight` |
| Body | `text-sm` |
| Metadata | `text-xs text-muted-foreground` |
| Micro / badges | `text-[11px] font-medium` |

---

## 3. Spacing, radius & elevation

- **Spacing:** Tailwind's 4px scale. Page padding `px-4 py-6` on mobile, `md:px-8 md:py-8`
  on desktop. Cards use `gap-4` / `gap-6` between blocks and `p-5` inside.
- **Radius:** `--radius: 0.875rem` (14px). Cards `rounded-2xl`, tiles/buttons `rounded-xl`,
  chips `rounded-full`, inputs `rounded-xl`.
- **Elevation:** soft and low-contrast — never a hard drop shadow.

```tsx
className="cozy-card" // rounded-2xl bg-card ring-1 ring-foreground/10 + soft layered shadow
```

- **Borders:** prefer `ring-1 ring-foreground/10` over `border` when a surface sits on
  another surface, so corners stay soft.

---

## 4. Layout rules

- **App shell:** `SidebarProvider` → `Sidebar` (collapsible to icons) → `SidebarInset`
  with a sticky top bar. Defined in `components/app-shell.tsx` and mounted once by the root
  layout (`app/layout.tsx`), so every page shares it — `/sign-in` and `/sign-up` opt out and
  render full-screen.
- **Routes:** the app lives at the root (`/` = Dashboard). `/dashboard` redirects to `/` so old
  links keep working. There are no route groups — everything sits directly in `app/`.
- **Sidebar width:** 15rem expanded, 3rem collapsed (icon rail). Collapse state persists via
  the `sidebar_state` cookie and `⌘/Ctrl + B`.
- **Sidebar groups:** items are grouped with small uppercase labels (`Workspace`,
  `Create & share`, `Account`). The grouping lives in `navGroups` in `lib/navigation.ts`.
- **Sidebar density:** menu rows are `h-8`, `text-[13px]`, `gap-2`, `rounded-lg`, 16px icons.
  Keep it compact — the rail should feel light, not chunky.
- **Sidebar footer:** keep it minimal — a divider plus the shortcuts menu. No upgrade card
  and no profile card; the account menu belongs in the top bar.
- **Collapsed rail:** icons only, 32px square buttons, tooltips on hover, and the active item
  keeps its warm highlight.
- **Content width:** cap dashboards at `max-w-6xl` and centre them.
- **Warm wash:** `.cozy-glow` layers three soft radial gradients (coral, sky, emerald) behind
  page content.
- **Active item:** `isNavItemActive(pathname, href)` in `lib/navigation.ts` decides highlighting —
  the root route only matches exactly so it never highlights on every page.

---

## 5. Component guidelines

- **Buttons:** primary = coral (`bg-primary text-primary-foreground`); AI actions use the
  sky→violet gradient; secondary = outline with `bg-card/70`; icon-only buttons are
  `size="icon-xs"`/`"icon-sm"` with `text-muted-foreground` that warms up on hover.
- **Cards:** `cozy-card` + a `p-5` body. Titles use `font-heading`.
- **Icon chips:** `flex size-9 items-center justify-center rounded-xl` with a 100/15 tint
  background and a matching 500/300 text colour (see the tone map in `app/page.tsx`).
- **Status:** success = emerald, warning = amber, info = sky, feature = violet.
- **Motion:** 150–200ms, `ease-out`. Avoid bounce or spring animations — calm wins.
- **Focus:** always keep a visible `ring` for keyboard users; never remove outlines.

---

## 6. Writing style

- Short, human sentences. No exclamation marks in UI copy.
- Sentence case for labels and buttons ("Ask AI", not "ASK AI").
- Describe the outcome, not the mechanism ("Your day at a glance", not "Dashboard module").

---

## 7. Adding a new destination

1. Add an entry to the right group in `navGroups` (`lib/navigation.ts`) — title, href, Lucide
   icon, `iconClassName`, description.
2. Create `app/<route>/page.tsx` and render `<PlaceholderView item={getNavItem("/<route>")} />`.
3. The sidebar, top bar and active-state highlighting update automatically.

The Dashboard entry is the only one with a root href (`/`), so keep `isNavItemActive` in mind
when adding routes that share a prefix.
