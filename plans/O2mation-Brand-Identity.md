# O2mation Brand Identity Guide
> *The single source of truth for how every O2mation product looks and feels.*
> *Give this file to any AI coder or developer before they write a single line of UI.*

---

## 1. Brand Name System

### The naming formula
Every O2mation product follows this exact pattern:

```
O2mation  ·  [Product Name]
```

The **dot separator** ( · ) is the visual signature — a small filled circle rendered at `oxygen.500` (#00E074). It sits between the bold brand word and the lighter product word.

| Product | Full Name |
|---|---|
| Payroll / HR | O2mation · Salaries |
| Point of Sale | O2mation · POS |
| Supermarket | O2mation · Market |
| Inventory | O2mation · Inventory |
| CRM | O2mation · CRM |
| Logistics | O2mation · Dispatch |

> **Rule:** The company word is always `O2mation` — never "Oxygen Air", never "O2". The product word is a short, single noun. Never use more than one word after the dot.

---

## 2. The Wordmark / Logo Construction

There is **no image logo file**. The logo is built in code from typography + a colored dot. This is intentional — it scales perfectly at any size.

### Structure (React / JSX reference)
```tsx
<div className="flex items-baseline gap-2">
  {/* Bold word = brand anchor */}
  <span className="text-2xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">
    O2mation
  </span>

  {/* The dot — always oxygen-500 (#00E074), perfectly centered */}
  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-oxygen-500)] self-center" />

  {/* Light word = product name */}
  <span className="text-2xl font-normal font-[var(--font-heading)] tracking-tight text-[var(--fg-subtle)]">
    Salaries
  </span>
</div>
```

### Logo size variants
| Context | Heading classes | Dot classes |
|---|---|---|
| Sidebar (collapsed header) | `text-2xl` | `w-1.5 h-1.5` |
| Login hero (big display) | `text-6xl` | `w-3 h-3` |
| Mobile fallback | `text-3xl` | `w-2 h-2` |

### Logo placement rules
1. **Sidebar** — top-start of the left-hand sidebar, `mb-16` below it before the nav menu starts. Fixed position on all pages of the app.
2. **Login page (desktop)** — large display on the dark left panel, centered vertically with a tagline below it.
3. **Login page (mobile)** — shown at the **top of the form column** when the dark panel is hidden (responsive breakpoint `lg`).
4. **Never** place the logo on a colored/green background. Only on white, `bg-page` (gray-50), or `oxygen-950` (near-black).

---

## 3. Color Palette

All colors are maintained via CSS variables in `tailwind.css` to allow seamless light/dark mode and RTL switching without needing complex JS runtime interpolation.

### Brand token: `oxygen`

The brand color is an electric, vibrant green named **oxygen**. It is the only accent color in the system.

| CSS Variable | Hex | Usage |
|---|---|---|
| `--color-oxygen-50` | `#e0fff0` | Active nav item background, icon container backgrounds |
| `--color-oxygen-100` | `#b3ffdb` | Avatar background in brand context |
| `--color-oxygen-200` | `#80ffc5` | Subtle borders on highlighted cards |
| `--color-oxygen-300` | `#4dffb0` | Emphasized state |
| `--color-oxygen-400` | `#1aff9a` | Focus ring on inputs |
| **`--color-oxygen-500`** | **`#00E074`** | **THE brand color.** Dot separator, active indicators, primary buttons, progress bars, checkboxes, badges |
| `--color-oxygen-600` | `#00b35d` | Icon color on light bg, active text color |
| `--color-oxygen-700` | `#008646` | Foreground color for brand text on muted bg |
| `--color-oxygen-800` | `#005a2f` | Dark mode accent |
| `--color-oxygen-900` | `#002d17` | — |
| `--color-oxygen-950` | `#00170c` | **Dark panel background** (login hero, dark overlays) |

### Semantic color roles (Light Mode)
```css
/* Backgrounds */
--bg-page: #f9fafb;       /* gray.50 */
--bg-surface: #ffffff;    /* pure white */
--bg-muted: #f9fafb;      /* gray.50 */
--bg-subtle: #f3f4f6;     /* gray.100 */

/* Foregrounds */
--fg-default: #111827;    /* gray.900 */
--fg-muted: #6b7280;      /* gray.500 */
--fg-subtle: #9ca3af;     /* gray.400 */
--fg-heading: #111827;    /* gray.900 */

/* Borders */
--border-default: #e5e7eb;/* gray.200 */
--border-muted: #f3f4f6;  /* gray.100 */
```

### Status colors (Standard Tailwind utility palette)
| Status | Tailwind colors |
|---|---|
| Active / Success | `bg-green-100 text-green-700` |
| Error | `bg-red-100 text-red-700` |
| Archived / Neutral | `bg-gray-100 text-gray-700` |
| Info | `bg-blue-100 text-blue-700` |

> **Important:** The brand accent `oxygen` is used for **all interactive/primary actions**. Standard semantic colors (green/red/orange) are used only for **status badges and feedback indicators**, never for primary buttons or navigation.

---

## 4. Typography

### Font stack
| Role | Font | Fallback | Weight used |
|---|---|---|---|
| **Headings** (`--font-heading`) | `Outfit` | `IBM Plex Sans Arabic`, `sans-serif` | 300, 400, 500, 600, **700** |
| **Body / UI** (`--font-body`) | `Plus Jakarta Sans` | `IBM Plex Sans Arabic`, `sans-serif` | 400, 500, **600**, **700** |
| **Arabic (RTL)** | `IBM Plex Sans Arabic` | `sans-serif` | 300, 400, 500, 600, 700 |

### Google Fonts import (HTML `<head>`)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Typography rules
- **Page titles** — `text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]`
- **Section headers** — `text-xl font-bold font-[var(--font-heading)]`
- **Card big numbers / KPIs** — `text-4xl font-bold tracking-tight leading-none`
- **Body text** — Base text uses Plus Jakarta Sans `text-sm` or `text-base` 
- **Caps labels / section labels** — `text-xs font-bold tracking-widest uppercase text-[var(--fg-subtle)]`
- **Arabic / RTL** — IBM Plex Sans Arabic renders automatically through the fallback hierarchy. 

---

## 5. UI Library & Tech Stack

### Core
| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19 |
| Language | TypeScript | Strict mode, no `any` |
| Build tool | Vite | 7 |
| Router | React Router DOM | 7 |
| Styling | Tailwind CSS | 4 |

### UI Component Strategy
**Tailwind CSS v4** is the exclusive styling system for O2mation. We use raw HTML native elements stitched with semantic Tailwind design tokens.

> **Critical:** We explicitly **DO NOT** use Chakra UI, Material UI, or any heavy runtime CSS-in-JS libraries. 
> To maximize performance, we avoid wrapping primitive elements in thick abstraction layers (`<Box>`, `<Flex>`, etc.). Output is simple, native HTML `div`, `span`, `button`, and `table` decorated with Tailwind utility classes.

### Supporting libraries
| Library | Purpose |
|---|---|
| `@tanstack/react-query ^5` | All data fetching and cache management |
| `zustand ^5` | Global state (auth store, etc.) |
| `react-i18next ^16` | i18n / translations |
| `lucide-react` | All icons |
| `luxon ^3` | Date formatting |
| `react-router-dom ^7` | Routing |
| `@supabase/supabase-js ^2` | Backend (never called directly from components — always via service files) |

### Icon system
Use **only Lucide icons** from `lucide-react`. Import pattern:
```tsx
import { LayoutDashboard as LuLayoutDashboard, Users as LuUsers, Wallet as LuWallet, Settings as LuSettings } from "lucide-react"
```
Never use `heroicons`, `feather`, `fa*`, or `bs*`. Adjust stroke width utilizing native props `strokeWidth={2.5}` for active states.

---

## 6. Layout Architecture

### App shell
```
┌──────────────────────────────────────────────┐
│  Sidebar (280px, fixed start)                 │  Topbar (h-20, fixed top, pushed by sidebar width)
├────────┬─────────────────────────────────────┤
│        │  Topbar                              │
│ Side-  ├─────────────────────────────────────┤
│  bar   │                                      │
│        │   Main Content (pt-20, overflow-y-auto) │
│        │                                      │
└────────┴─────────────────────────────────────┘
```

### Sidebar (`w-[280px]`)
- **Background:** `bg-[var(--bg-surface)]`
- **Border:** `border-e border-[var(--border-muted)]` (logical border-end, crucial for bidirectional support)
- **Position:** `fixed top-0 start-0 h-screen` 
- **Padding:** `py-8 px-6`
- **Logo area:** Top of sidebar, `mb-16` below logo before nav starts
- **Section label:** `"MAIN MENU"` in all-caps, `text-[var(--nav-section-label)]`, before the nav items
- **Active nav item state:**
  - Background: `bg-[var(--nav-active-bg)]`
  - Text color: `text-[var(--nav-active-color)] font-bold`
  - Start edge accent bar: `absolute start-[-24px] top-1/2 -translate-y-1/2 w-[3px] h-4 bg-[var(--color-oxygen-500)] rounded-full`
  - Icon stroke weight: `2.5` (vs `2` for inactive)
- **Hover state:** `hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-active-color)]`
- **Border radius** of nav items: `rounded-lg`
- **Transition:** `transition-all duration-200`

### Topbar (`h-20`)
- **Background:** `bg-[var(--bg-surface)]`
- **Border:** `border-b border-[var(--border-muted)]`
- **Positioning:** `fixed top-0 start-[280px] end-0 z-10 px-8 flex items-center justify-end`
- **User avatar:** `bg-[var(--color-oxygen-100)] text-[var(--color-oxygen-700)]` (brand-tinted initials)

### Page content area
- **Background:** `bg-[var(--bg-page)]` (applies to the `AppLayout` wrapper)
- **Content padding:** Typically `px-8 pt-10 pb-8` or bounded inside constraints.
- **Main scrollable area:** `flex-1 pt-20 overflow-y-auto`

---

## 7. Component Design Language

### Cards
```tsx
// Standard stat/data card
<div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-6 shadow-sm">
  {/* Content */}
</div>

// Employee/Item row card
<div className={cn(
  "bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] shadow-sm py-2 px-3 transition-all duration-200",
  "hover:shadow-md hover:bg-[var(--nav-active-bg)]",
  isSelected && "border-[var(--color-oxygen-500)] shadow-md"
)}>
  {/* Row data */}
</div>
```

### Buttons
- Primary CTA: Solid green pill `bg-[var(--color-oxygen-500)] text-white hover:bg-[var(--color-oxygen-600)] transition-colors py-2 px-4 rounded-lg font-semibold text-sm`
- Secondary / ghost: `hover:bg-[var(--bg-subtle)] text-[var(--fg-default)] rounded-lg py-2 px-4`
- Border radius on all buttons: `rounded-lg`
- Icon buttons: Standard flex centering with `hover:text-[var(--color-oxygen-600)]`

### Inputs & Forms
- Border radius: `rounded-lg`
- Focus ring color: `focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:outline-none`
- Borders: `border border-[var(--border-default)]`
- Background when unfocused: `bg-[var(--bg-surface)]`
- Placeholder text: `placeholder:text-[var(--fg-subtle)]`

### Badges
- Status: `px-2 py-0.5 rounded-full text-xs font-semibold`
- Primary Brand Pill: `bg-[var(--color-oxygen-100)] text-[var(--color-oxygen-700)]`
- Inactive Pill: `border border-[var(--border-default)] text-[var(--fg-muted)]`

### Drawers / Modals
- Built natively or wrapped in headless accessible components.
- Backdrop: `bg-black/50 backdrop-blur-sm`
- Drawer window opens from the right (or 'end') by defaulting position constraints logic (`fixed top-0 end-0 h-screen w-96 bg-[var(--bg-surface)] shadow-2xl`).

### Native Table Elements for Performance
Instead of bloated mapping components, tabular data uses robust native HTML tables structured for speed and native browser memory management:
```tsx
<div className="border border-[var(--border-default)] rounded-xl overflow-x-auto bg-[var(--bg-surface)] shadow-sm native-table-container">
  <table className="native-table">
    <thead>
      <tr>
        <th>Column Name</th>
      </tr>
    </thead>
    <tbody>
      <tr className="native-tr row-even">
        <td>Row Content</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 8. Dark Panel Treatment (Login / Onboarding)

The login page and any marketing/splash screens use a **split-screen layout**:

- **Left panel (brand panel):** `bg-[var(--color-oxygen-950)]` (#00170c — near-black with green undertone)
- **Right panel (form):** `bg-[var(--bg-surface)]`

The brand panel contains:
1. The wordmark (large, `text-6xl`)
2. A short tagline in `text-white/80`
3. A glassmorphism quote card: `bg-white/10 backdrop-blur-md border object border-white/20 rounded-2xl p-6`

**Glowing orb decorations** on the brand panel:
```tsx
// Primary orb — top-start
<div className="absolute top-[-10%] start-[-10%] w-[40vw] h-[40vw] bg-[var(--color-oxygen-500)] rounded-full blur-[160px] opacity-30 pointer-events-none" />

// Secondary orb — bottom-end
<div className="absolute bottom-[-20%] end-[-10%] w-[35vw] h-[35vw] bg-teal-600 rounded-full blur-[160px] opacity-20 pointer-events-none" />
```
These create the signature "oxygen glow" atmospheric effect natively in CSS.

---

## 9. RTL / Bilingual Support

The app is fully bilingual: **English (LTR)** and **Arabic (RTL)**.

### Rules
- All user-facing strings go through `react-i18next` — no hardcoded strings in JSX
- Locale files live in `public/locales/{en,ar}/*.json`
- Layout uses `dir` attribute: `document.documentElement.dir = "rtl"` or `"ltr"`
- **Tailwind Logical Properties** are mandatory. NEVER use physical positioning constraints (`left-*`, `right-*`, `ml-*`, `pr-*`).
  - Use `start-0` instead of `left-0`.
  - Use `end-0` instead of `right-0`.
  - Use `border-e` instead of `border-r`.
  - Use `ms-` (margin-inline-start) instead of `ml-`.
  - Use `pe-` (padding-inline-end) instead of `pr-`.
- Arabic font: `IBM Plex Sans Arabic` loaded via Google Fonts automatically scales with Tailwind due to the fallback hierarchy.

---

## 10. Animation & Interaction Principles

- **Transitions:** `transition-all duration-200` on interactive elements (nav items, cards, buttons)
- **Hover effects:** Subtle — change background a shade (`hover:bg-[var(--nav-hover-bg)]`), increase shadow.
- **No heavy animations.** The UI should feel fast and business-appropriate, not playful
- **Focus visible ring:** `focus:ring-2 focus:ring-[var(--color-oxygen-400)] focus:outline-none`
- **Cursor:** `cursor-pointer` on clickable cards and text links

---

## 11. Tailwind Global Configuration (tailwind.css)

This is the exact theme setup mapped into the `tailwind.css` V4 `@theme` directive, completely removing the necessity for frontend style JS engines. 

```css
@theme {
    --color-oxygen-50: #e0fff0;
    --color-oxygen-100: #b3ffdb;
    --color-oxygen-200: #80ffc5;
    --color-oxygen-300: #4dffb0;
    --color-oxygen-400: #1aff9a;
    --color-oxygen-500: #00E074;
    --color-oxygen-600: #00b35d;
    --color-oxygen-700: #008646;
    --color-oxygen-800: #005a2f;
    --color-oxygen-900: #002d17;
    --color-oxygen-950: #00170c;

    --color-charcoal-50: #f0f1f2;
    --color-charcoal-100: #d9dbde;
    --color-charcoal-200: #9aa0a8;
    --color-charcoal-300: #6b727b;
    --color-charcoal-400: #4a5058;
    --color-charcoal-500: #33383e;
    --color-charcoal-600: #2a2e33;
    --color-charcoal-700: #22262b;
    --color-charcoal-800: #1a1d21;
    --color-charcoal-900: #141618;
    --color-charcoal-950: #0e1012;

    /* Font families */
    --font-heading: "Outfit", "IBM Plex Sans Arabic", sans-serif;
    --font-body: "Plus Jakarta Sans", "IBM Plex Sans Arabic", sans-serif;
}
```

Light Themes and Dark Themes are configured precisely using mapped CSS Semantic Variables:

```css
:root {
    /* Backgrounds */
    --bg-page: #f9fafb;       /* gray.50 */
    --bg-surface: #ffffff;
    --nav-active-bg: #ecfdf5; /* oxygen.50 light */
}

.dark {
    /* Backgrounds */
    --bg-page: #1a1d21;       /* charcoal.800 */
    --bg-surface: #2a2e33;    /* charcoal.600 */
    --nav-active-bg: #002d17; /* oxygen.900 */
}
```

---

## 12. Product Adaptation Template

When creating a new product (e.g., a POS system), follow this checklist:

### What stays the same (always)
- [x] `oxygen` color palette — identical hex values mapped via CSS var in Tailwind configuration.
- [x] Font stack — Outfit + Plus Jakarta Sans + IBM Plex Sans Arabic.
- [x] Logo construction — `O2mation · [ProductName]` rendered directly in HTML.
- [x] Sidebar structure, logo placement, active state indicator (all RTL safe logical classes).
- [x] Topbar structure.
- [x] Lucide `lucide-react` icons only.
- [x] `rounded-lg` or `rounded-xl` for cards/buttons (no sharp corners).
- [x] Tailwind CSS `duration-200` globally.
- [x] `bg-[var(--bg-page)]` app shell with `bg-[var(--bg-surface)]` interactive cards.

### What adapts per product
| Element | Payroll | POS | Market | Inventory |
|---|---|---|---|---|
| Wordmark subtitle | Salaries | POS | Market | Inventory |
| Sidebar nav items | Dashboard, Employees, Payroll | Dashboard, Sales, Products | Dashboard, Checkout, Inventory | Dashboard, Stock, Orders |
| Domain colors (badges)| green=active, orange=archived | green=in-stock, red=out | green=available, orange=discount | blue=incoming, green=stocked |

### Steps to start a new O2mation product
1. Copy the `src/tailwind.css` global theme variables verbatim.
2. Copy the `index.html` `<head>` font import verbatim.
3. Install `tailwindcss` v4 and setup Vite context.
4. Set up `react-i18next` with `en` and optionally `ar` locales.
5. Build the sidebar natively with the `O2mation · [YourProduct]` wordmark.
6. Replace nav items with product-appropriate routing pages.
7. Start building pages — utilizing standard native HTML combined with semantic `--var` and Tailwind primitives.

---

## 13. What NOT to do (Anti-Patterns to Reject)

| ❌ Don't | ✅ Do instead |
|---|---|
| Rely on heavy CSS-in-JS or component libraries like Chakra UI | Rely strictly on Tailwind CSS utility classes |
| Use static/arbitrary hex codes out of place (`bg-[#12ab34]`) | Use semantic CSS Variables (`bg-[var(--color-oxygen-500)]`) |
| Use physical padding constraints (`padding-left`) | Use Logical constraints exclusively to serve RTL natively (`ps-4`) |
| Hardcode border directions (`border-r`) | Use Logical borders (`border-e`) |
| Create a static logo image file (`.png`, `.svg`) | Render the wordmark directly in HTML text natively |
| Wrap simple designs in heavy DOM components (`<Box>`) | Stick to native elements (`<div>`, `<span>`, `<button>`) |
| Use generic system fonts everywhere (`Inter`) | Rely meticulously on `--font-heading` (Outfit) and `--font-body` |
| Mix Heroicons, FontAwesome, etc. | Use only `lucide-react` icons |

---

*Document generated from the live O2mation · Market codebase — March 2026 (Migrated to Tailwind CSS System).*
