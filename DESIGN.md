# DESIGN.md — EcoPest إيكوبست

> Design system document for AI coding agents.
> Read this before generating any UI component, page, or layout.
> All styling uses Tailwind CSS v3. RTL is mandatory throughout.

---

## Brand Identity

**Product:** EcoPest — إدارة محطات الطعوم  
**Category:** Field operations management dashboard  
**Audience:** Pest control field teams — technicians in the field (mobile) + supervisors and managers at a desk (desktop)  
**Tone:** Functional, trustworthy, Arabic-first. No decorative flourishes. Every pixel earns its place.  
**Aesthetic reference:** Linear.app meets a government field operations tool — clean dark sidebar, crisp white content area, muted accent, high-information density without clutter.

---

## Layout System

### Global

```
Direction:     RTL (dir="rtl") on <html> and all containers
Font:          Tajawal — import from Google Fonts on web, bundled local font files on mobile
Fallback:      system-ui, sans-serif
Base size:     16px
Line height:   1.6 for body, 1.2 for headings
```

### Shell (authenticated pages)

```
┌─────────────────────────────────────────┐
│ Sidebar (240px) │  Main content area    │
│  dark bg        │  light bg             │
│  RTL: right     │  RTL: left of sidebar │
└─────────────────────────────────────────┘
```

- Sidebar sits on the **right** in RTL (use `flex-row-reverse` or `flex-row` with sidebar last in DOM)
- Content area fills remaining width: `flex-1 min-w-0`
- Mobile: sidebar collapses to bottom tab bar or hamburger
- Max content width: `max-w-7xl mx-auto px-4 sm:px-6`

### Public pages (scan, login)

```
Centered card layout
max-w-md mx-auto
Vertical padding: py-12
```

---

## Color Palette

### Primary — Slate (neutral base)

```
slate-950   #020617   sidebar background
slate-900   #0f172a   sidebar hover, dark surfaces
slate-800   #1e293b   sidebar active item, dark borders
slate-700   #334155   muted borders on dark
slate-500   #64748b   sidebar secondary text, placeholders
slate-400   #94a3b8   sidebar icons, disabled text
slate-200   #e2e8f0   content area borders
slate-100   #f1f5f9   content area subtle background
slate-50    #f8fafc   page background
white       #ffffff   cards, form surfaces
```

### Accent — Teal (action color)

```
teal-700    #0f766e   primary button (normal)
teal-600    #0d9488   primary button (hover)
teal-500    #14b8a6   links, focus rings, active nav indicator
teal-100    #ccfbf1   accent background (badges, highlights)
teal-50     #f0fdfa   accent tint backgrounds
```

> Teal was chosen for its association with environmental work and field operations. It reads clearly against both dark sidebar and light content backgrounds.

### Semantic colors

```
success:    green-600 / green-100 bg  — active station, reviewed report
warning:    amber-600 / amber-100 bg  — pending review, approaching deadline
danger:     red-600   / red-100   bg  — inactive station, rejected report
info:       blue-600  / blue-100  bg  — general information
```

### Status badge mapping

| State | Text class | Background class |
|-------|-----------|-----------------|
| محطة نشطة (active) | `text-green-700` | `bg-green-100` |
| محطة غير نشطة (inactive) | `text-slate-600` | `bg-slate-100` |
| بانتظار المراجعة (pending) | `text-amber-700` | `bg-amber-100` |
| تمت المراجعة (reviewed) | `text-green-700` | `bg-green-100` |
| مرفوض (rejected) | `text-red-700` | `bg-red-100` |

---

## Typography

All text uses Tajawal. Arabic text looks best at slightly larger sizes than Latin equivalents.

### Scale

```
text-xs     12px    metadata, timestamps, legal
text-sm     14px    table cells, secondary labels, helper text
text-base   16px    body copy, form labels, nav items
text-lg     18px    card titles, section headings
text-xl     20px    page subtitle
text-2xl    24px    page title (h1)
text-3xl    30px    stat card numbers
text-4xl    36px    hero numbers on dashboard
```

### Weights

```
font-normal  400    body, descriptions
font-medium  500    labels, nav items, table headers
font-semibold 600   card titles, stat labels
font-bold    700    page headings, primary numbers
```

### Usage rules

- Page titles (`h1`): `text-2xl font-bold text-slate-900`
- Section headings (`h2`): `text-lg font-semibold text-slate-800`
- Table headers: `text-xs font-medium text-slate-500 uppercase tracking-wide`
- Body text: `text-sm text-slate-700`
- Muted/secondary: `text-sm text-slate-500`
- Sidebar nav: `text-sm font-medium`
- Stat numbers: `text-3xl font-bold text-slate-900`

---

## Spacing

Follow Tailwind's 4px base unit strictly. No arbitrary values.

```
Component internal padding:  p-4 (16px) standard, p-6 (24px) for cards
Between sections:            space-y-6 or gap-6
Page padding:                px-4 sm:px-6 lg:px-8, py-6
Table cell padding:          px-4 py-3
Form field gap:              space-y-4
Button padding:              px-4 py-2 (sm), px-6 py-2.5 (md), px-8 py-3 (lg)
Sidebar padding:             px-3 py-2 per nav item, px-4 for section labels
```

---

## Component Patterns

### Sidebar Navigation

```tsx
// Sidebar shell
<nav className="w-60 bg-slate-950 min-h-screen flex flex-col py-4">
  // App name
  <div className="px-4 mb-6">
    <span className="text-white font-bold text-lg">إيكوبست</span>
    <span className="text-slate-500 text-xs block">إدارة محطات الطعوم</span>
  </div>

  // Nav section
  <div className="flex-1 space-y-1 px-2">
    // Active item
    <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">
    // Inactive item
    <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors">
  </div>

  // Bottom: user + logout
  <div className="px-4 pt-4 border-t border-slate-800">
    <span className="text-slate-400 text-xs">{user.displayName}</span>
  </div>
</nav>
```

### Page Header

```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-slate-900">المحطات</h1>
    <p className="text-sm text-slate-500 mt-1">إدارة محطات الطعوم الميدانية</p>
  </div>
  <button className="btn-primary">إضافة محطة</button>
</div>
```

### Stat Cards (dashboard)

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <p className="text-sm font-medium text-slate-500">إجمالي المحطات</p>
    <p className="text-3xl font-bold text-slate-900 mt-1">48</p>
    <p className="text-xs text-green-600 mt-2">↑ 3 هذا الأسبوع</p>
  </div>
</div>
```

### Data Table

```tsx
<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
  <table className="w-full">
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wide">
          اسم المحطة
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-100">
      <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-4 py-3 text-sm text-slate-900">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Buttons

```tsx
// Primary
<button className="inline-flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">

// Secondary
<button className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors">

// Danger
<button className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">

// Ghost (table actions)
<button className="text-sm text-slate-500 hover:text-slate-900 hover:underline transition-colors">
```

### Form Fields

```tsx
<div className="space-y-1">
  <label className="block text-sm font-medium text-slate-700">
    اسم المحطة
  </label>
  <input
    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400
               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent
               disabled:bg-slate-50 disabled:text-slate-500"
    placeholder="مثال: المنطقة أ - محطة 3"
  />
  // Error state: border-red-300 focus:ring-red-500
  <p className="text-xs text-red-600">هذا الحقل مطلوب</p>
</div>
```

### Checkboxes (status selection in report form)

```tsx
<label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-colors has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50">
  <input type="checkbox" className="w-5 h-5 rounded accent-teal-600" />
  <span className="text-sm font-medium text-slate-700">المحطة سليمة</span>
</label>
```

> Checkboxes in the technician report form must have `min-h-[44px]` touch targets for mobile use in the field.

### Status Pills / Badges

```tsx
// Use inline-flex, not block, to prevent full-width stretch
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
  نشطة
</span>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
    {/* Simple SVG icon */}
  </div>
  <h3 className="text-sm font-semibold text-slate-900 mb-1">لا توجد محطات</h3>
  <p className="text-sm text-slate-500 mb-4">ابدأ بإضافة أول محطة طعوم</p>
  <button className="btn-primary text-sm">إضافة محطة</button>
</div>
```

### Loading Skeleton

```tsx
// Use for server-fetched data before it arrives (loading.tsx files)
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
</div>
```

### Toast / Notification

```tsx
// Success
<div className="fixed top-4 left-4 z-50 flex items-center gap-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm">
  <span className="text-green-400">✓</span>
  تم حفظ التقرير بنجاح
</div>
```

---

## RTL Rules

These are mandatory. Never skip them.

```
All text:         text-right (default in RTL, but set explicitly)
Flex rows:        use gap-* instead of mr-*/ml-* for spacing between items
Padding:          use ps-* and pe-* instead of pl-* and pr-*
Margin:           use ms-* and me-* instead of ml-* and mr-*
Border accent:    use border-e-* (border-end) for sidebar active indicator
Icons in buttons: icons go on the LEFT side of text in LTR → RIGHT side in RTL
  Example:  <span>إضافة</span> <PlusIcon />  (icon after text in RTL)
Tables:     text-right on th and td
Inputs:     text-right, direction auto for content
```

---

## Card Surface Hierarchy

```
Page background:   bg-slate-50
Card surface:      bg-white with border border-slate-200
Nested surface:    bg-slate-50 (table headers, form sections)
Dark surface:      bg-slate-950 (sidebar only)
```

All cards use `rounded-xl` (12px). Use `rounded-lg` (8px) for inner elements like badges, inputs, buttons. No `rounded-full` except for avatar circles and small status dots.

---

## Mobile Considerations

EcoPest technicians use their phones in the field. These rules apply to all pages under `/scan` and `/station/`:

```
Touch targets:     min-h-[44px] min-w-[44px] for all interactive elements
Font size:         minimum text-base (16px) for all form labels and inputs
                   Never text-xs on interactive elements on mobile
Checkbox size:     w-5 h-5 minimum
Submit button:     w-full, py-3, text-base on mobile
Spacing:           px-4 on mobile, not px-2
Error messages:    text-sm, clearly visible (never pale gray on white)
```

---

## Do Not

- No gradients anywhere (no `bg-gradient-*` unless a specific exception is documented)
- No shadows heavier than `shadow-sm` on cards — use `border border-slate-200` instead
- No `rounded-full` on rectangular elements
- No decorative illustrations or hero images — this is an operations tool
- No animations beyond `transition-colors` and `animate-pulse` (skeleton loading)
- No hardcoded hex values — use only Tailwind palette classes
- No `text-black` — use `text-slate-900` maximum darkness
- No absolute/fixed positioning in content areas (only for toasts and modals)
- No `overflow-x-scroll` on mobile — make tables responsive with horizontal scroll on the table container only: `overflow-x-auto`

---

## Tailwind Config Extension

Add to `tailwind.config.ts` if not present:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Tajawal", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
```

Add to `app/globals.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
```

---

## Page Templates

### Manager / Supervisor Dashboard page
```
Shell: Sidebar (right) + Main content (left)
Main: PageHeader + StatsRow (4 cards) + RecentTable
Background: bg-slate-50
Cards: bg-white border border-slate-200 rounded-xl
```

### Station List page
```
Shell: Sidebar + Main
Main: PageHeader (title + Add button) + DataTable + Pagination
Empty state: centered EmptyState component
```

### Report Form page (technician — mobile first)
```
No sidebar
Full-width centered card: max-w-lg mx-auto
Station info box at top: bg-slate-50 rounded-xl p-4
Checkbox grid: space-y-2 stacked on mobile
Notes textarea: min-h-[80px]
Submit: w-full btn-primary py-3 text-base
Success screen: centered with checkmark, timestamp, back button
```

### Login page
```
No sidebar, no nav
Full-screen: bg-slate-50 min-h-screen flex items-center justify-center
Card: bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full
Logo/title at top center
```
