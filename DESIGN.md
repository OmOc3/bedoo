---
name: "EcoPest إيكوبست"
description: "Arabic-first pest-control field operations suite for bait stations, reports, teams, clients, and audits."
colors:
  background: "#f6f8fa"
  foreground: "#0d1117"
  muted: "#57606a"
  surface: "#ffffff"
  surface-subtle: "#f6f8fa"
  surface-elevated: "#ffffff"
  border: "#d0d7de"
  border-subtle: "#e8ecf0"
  primary: "#0f766e"
  primary-hover: "#0d6b63"
  primary-soft: "#f0fdfa"
  primary-muted: "#99f6e4"
  danger: "#cf222e"
  danger-soft: "#fff1f0"
  danger-muted: "#ffcdd3"
  warning: "#9a6700"
  warning-soft: "#fff8c5"
  success: "#1a7f37"
  success-soft: "#dafbe1"
  focus: "#0f766e"
  sidebar: "#0d1117"
  sidebar-surface: "#161b22"
  sidebar-border: "#21262d"
  sidebar-text: "#e6edf3"
  sidebar-muted: "#7d8590"
  sidebar-active: "#1f6feb"
  dark-background: "#0d1117"
  dark-foreground: "#e6edf3"
  dark-surface: "#161b22"
  dark-surface-elevated: "#1c2128"
  dark-primary: "#2dd4bf"
  dark-primary-soft: "#134e4a"
typography:
  display:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  touch-web: "44px"
  touch-mobile: "52px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "{spacing.touch-web}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "{spacing.touch-web}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "{spacing.touch-web}"
  status-chip:
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: EcoPest إيكوبست

## Overview

**Creative North Star: "The Field Operations Ledger"**

EcoPest is a restrained operations interface for pest-control teams. The design should feel like a reliable field ledger brought into a modern dashboard: status-heavy, audit-aware, readable in Arabic, and quick to scan when the user is moving between stations, reports, shifts, clients, and reviews.

The default scene is practical rather than atmospheric: a technician using a phone outdoors or in a service corridor, and a supervisor or manager reading a dense dashboard at a desk. This forces a restrained theme with strong contrast, clear status, familiar controls, and no decorative spectacle. The product is allowed to be dense because the work is dense; it is not allowed to be vague.

The system rejects the PRODUCT.md anti-references directly: decorative card farms, empty marketing hero sections, vague AI outputs without actions, client-side privileged writes, generic SaaS gradients, gradient text, glass defaults, nested cards, side-stripe status accents, repeated icon-heading-text grids, playful motion, and custom affordances that slow standard admin work.

**Key Characteristics:**

- RTL-first layout with Arabic as the default reading direction.
- Restrained color: neutral surfaces, teal for primary actions, semantic color for status.
- Dense but predictable dashboard structure.
- Mobile field controls with large targets and explicit recovery states.
- Complete light and dark themes through CSS variables.
- Familiar product UI patterns over invented affordances.

## Colors

The palette is a cool operational neutral system with one primary teal and explicit semantic tones. It is not a brand-campaign palette.

### Primary

- **Field Teal** (`primary`): used for primary actions, focus rings, selected state, active operational emphasis, and mobile field confirmation. It should stay rare enough to mean "act now" or "current."
- **Field Teal Hover** (`primary-hover`): used only for interactive hover and pressed states on primary controls.
- **Field Teal Wash** (`primary-soft`, `primary-muted`): used for selected backgrounds, gentle highlights, and status context where full teal would overstate importance.

### Secondary

- **Operations Blue** (`sidebar-active`): exists in the current token set for sidebar and technology clarity. Do not expand it into a second decorative accent. Use it only when an existing component already owns that meaning.

### Neutral

- **Ledger Background** (`background`, `surface-subtle`): page canvas and quiet grouped areas.
- **Paper Surface** (`surface`, `surface-elevated`): cards, forms, tables, and panels. New UI should reference tokens, not hardcode white.
- **Ink Foreground** (`foreground`): primary text and high-confidence labels.
- **Muted Ink** (`muted`): secondary text, helper copy, placeholders, and metadata.
- **Operational Lines** (`border`, `border-subtle`): dividers, table lines, card borders, and form control strokes.
- **Command Sidebar** (`sidebar`, `sidebar-surface`, `sidebar-border`, `sidebar-text`, `sidebar-muted`): navigation surfaces only. Do not use the sidebar palette as a generic dark-card theme.

### Tertiary

- **Success Green** (`success`, `success-soft`): reviewed, active, completed, synced, or valid states.
- **Warning Amber** (`warning`, `warning-soft`): pending review, queued sync, approaching deadline, early exit, or needs attention.
- **Danger Red** (`danger`, `danger-soft`, `danger-muted`): rejected, inactive, failed, blocked, destructive, or invalid states.

### Named Rules

**The Teal Means Action Rule.** Teal is for primary action, current selection, focus, and high-value operational emphasis. It is not decoration.

**The Status Must Survive Color Loss Rule.** Every status color needs a label, icon, dot, or placement cue. Never rely on color alone.

**The No Decorative Gradient Rule.** Gradients are forbidden for decoration, text, cards, heroes, and empty states. Existing technical overlays may remain only when they support surface depth or nav legibility.

## Typography

**Display Font:** Cairo on web, with `ui-sans-serif`, `system-ui`, and `sans-serif` fallback.

**Body Font:** Cairo on web, with the same fallback.

**Mobile Font:** Tajawal in the Expo app through bundled local font files.

**Label/Mono Font:** Use the same family for labels. Use system monospace only for identifiers when needed.

**Character:** The type system is compact, Arabic-readable, and operational. It should feel clear and durable, not editorial or expressive.

### Hierarchy

- **Display** (800, 36px, 1.2): rare dashboard numbers, major totals, and high-value summary figures.
- **Headline** (700, 24px, 1.25): page titles and major screen titles.
- **Title** (700, 18px, 1.35): section titles, card titles, panel headers, and mobile top-bar titles.
- **Body** (400, 16px, 1.6): forms, report text, dashboard prose, and mobile field content. Prose should stay under 75ch.
- **Compact Body** (400-600, 14px, 1.5): table cells, metadata, helper text, badges, and dashboard secondary labels.
- **Label** (600, 14px, 1.4): form labels, button text, filter labels, table headers, and nav labels.

### Named Rules

**The Arabic Legibility Rule.** Field forms and mobile report screens use at least 16px for labels and inputs. Dense desktop tables may use 14px only when hierarchy remains clear.

**The No Display Font In Controls Rule.** Buttons, labels, table headers, badges, and data never use display styling.

## Elevation

EcoPest uses a hybrid of borders, tonal layering, and restrained shadows. Borders carry most structure. Shadows are allowed for interactive controls, cards, floating nav, mobile drawers, toasts, and hover lift, but they must stay quiet and functional.

### Shadow Vocabulary

- **Control Shadow** (`0 1px 2px var(--ring-shadow)`): subtle buttons and form controls.
- **Card Shadow** (`0 1px 3px var(--ring-shadow), 0 1px 2px var(--ring-shadow)`): cards and table containers when a border alone is not enough.
- **Medium Card Shadow** (`0 4px 12px var(--ring-shadow), 0 2px 6px var(--ring-shadow)`): hover or raised dashboard surfaces.
- **Large Floating Shadow** (`0 8px 24px var(--ring-shadow), 0 4px 12px var(--ring-shadow)`): mobile drawers, floating nav buttons, and high-priority overlays.

### Named Rules

**The Border First Rule.** Start with a border and a surface token. Add shadow only when the surface floats, responds to hover, or must separate from dense content.

**The No Heavy Card Rule.** Cards do not use theatrical shadows. If a card looks like a marketing tile, reduce shadow and tighten the content.

## Components

### Buttons

- **Shape:** gently squared controls (8px radius), never pill buttons except icon-only circular controls where the platform pattern already exists.
- **Primary:** Field Teal background with tokenized foreground, 44px minimum web height, 52px mobile height, semibold label, and clear disabled state.
- **Hover / Focus:** hover shifts to `primary-hover`; focus uses a visible 2-3px token ring. Active press may scale subtly but must not move layout.
- **Secondary:** token surface with border and foreground text for non-destructive alternatives.
- **Ghost:** text-muted until hover. Use for quiet table actions and repeated navigation actions.
- **Danger:** danger token for destructive or blocking actions only.

### Chips

- **Style:** inline-flex, compact, rounded-full status chips with text plus a small dot when possible.
- **State:** active/reviewed/synced use success; pending/queued use warning; rejected/failed/inactive use danger or muted when inactive is neutral.
- **Behavior:** chips are labels unless explicitly implemented as filters. Do not make decorative chips.

### Cards / Containers

- **Corner Style:** default surface radius is 12px; inner controls use 8px.
- **Background:** use `surface` on `background`; nested areas use `surface-subtle`.
- **Shadow Strategy:** border first, card shadow only when useful for separation.
- **Border:** token border on every card, table wrapper, form section, and modal-like panel.
- **Internal Padding:** 16px for compact panels, 20px for dashboard cards, 24px for larger form and report surfaces.
- **Constraint:** never put a UI card inside another UI card. Use sections, dividers, or tonal nested surfaces instead.

### Inputs / Fields

- **Style:** 8px radius, token border, token surface, 44px minimum web height, clear placeholder color, right-aligned Arabic text by default.
- **Focus:** primary focus ring and border transition. Focus must be visible in both themes.
- **Error / Disabled:** error uses danger border/text and a readable message. Disabled uses subtle surface and muted text, not low-opacity mystery states.
- **Direction:** use RTL by default and LTR or `dir="ltr"` for emails, station IDs, URLs, and technical identifiers.

### Navigation

- **Desktop:** fixed right sidebar in RTL, dark command palette, collapsed/expanded behavior, consistent icon style, and active teal-tinted item.
- **Mobile:** bottom navigation plus drawer for full menu access. Targets remain at least 44px, labels do not wrap awkwardly, and the drawer traps focus while open.
- **Typography:** compact semibold labels. Navigation text should truncate rather than resize the shell.
- **State:** current route is obvious through background, color, and optional dot. Hover states are quiet.

### Tables and Lists

- **Structure:** use table wrappers with `overflow-x-auto` only on the table container. Do not make the whole page horizontally scroll.
- **Headers:** compact semibold muted text with right alignment.
- **Rows:** alternating or hover surface-subtle treatments are allowed when they improve scanning.
- **Mobile:** convert dense tables to cards only when the table cannot preserve meaning on narrow screens.

### Mobile Field Patterns

- **Report Forms:** stack controls, use 16px text, 52px button targets in Expo, and explicit sync/draft/retry states.
- **Station Summary:** show station label, location, active state, station ID, and zone before the report controls.
- **Offline / Sync:** queued, syncing, failed, and submitted states must be visible and actionable.

## Do's and Don'ts

### Do:

- **Do** keep `dir="rtl"` and Arabic-first layout on all primary web and mobile surfaces.
- **Do** use Cairo for web UI and Tajawal for the current Expo mobile UI until the mobile typography system is intentionally changed.
- **Do** use CSS variables and Tailwind tokens for colors; avoid hardcoded colors in new UI.
- **Do** keep primary actions teal and status meaning semantic.
- **Do** use `ps-`, `pe-`, `ms-`, and `me-` logical utilities for RTL spacing.
- **Do** preserve large touch targets for technician and mobile companion workflows.
- **Do** provide loading, empty, error, disabled, pending, sync, and review states for task-critical surfaces.
- **Do** make AI or analytics output actionable, sourced, and bounded by available operational data.

### Don't:

- **Don't** create decorative card farms.
- **Don't** create empty marketing hero sections.
- **Don't** show vague AI outputs without actions.
- **Don't** implement client-side privileged writes.
- **Don't** use generic SaaS gradients, gradient text, glass defaults, or purple-blue launch-page styling.
- **Don't** nest cards inside cards.
- **Don't** use side-stripe status accents.
- **Don't** repeat icon-heading-text grids as filler.
- **Don't** use playful motion, animated spectacle, or custom affordances that slow standard admin work.
- **Don't** use `text-black`, `#000`, or new hardcoded pure-white surfaces. Use tokens.
- **Don't** use modals as the first answer when inline review, progressive disclosure, or page-level flows would work better.
