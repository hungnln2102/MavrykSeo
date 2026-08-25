---
name: taste
description: "Perceptual Design Defaults — science-backed lookup tables for typography, color contrast, spacing, motion, and icons. Adapted from PencilPlaybook (stevembarclay/pencilplaybook). Use this skill as a reference when building or reviewing any frontend UI component to ensure designs are perceptually grounded, accessible, and production-quality. Not a replacement for Impeccable — complementary: Taste provides the 'why' and 'what values', Impeccable provides the 'how to check and fix'."
version: 1.0.0
---

# Taste Skill — Perceptual Design Defaults for MavrykSeo

> Adapted from [PencilPlaybook](https://github.com/stevembarclay/pencilplaybook) (MIT License) by Steve M. Barclay.
> Extracted and adapted for web application development (Next.js/React).

This skill provides **science-backed design defaults** that every UI component in MavrykSeo should follow. These are not opinions — they are measurable, testable, reproducible values that senior product designers converge on after years of experience.

**When to use this skill:**
- Building new UI components
- Reviewing existing UI for quality
- Making design decisions about typography, color, spacing, motion, or icons
- Complementary to the `impeccable` skill — Taste provides the reference values, Impeccable provides the audit/fix workflow

---

## Core Principles

1. **Disabled at 40%, not 50%** — MD3 and Workday both converged here after user testing; 50% creates visual competition with active elements
2. **Hover states need an 8% lightness delta minimum** — below that, the state is imperceptible on most monitors
3. **Body text on dark backgrounds: not pure white** — halation makes it harder to read; use `#E2E8F0` or `#F1F5F9`
4. **Display type at 56px+: −0.03em letter spacing** — optical counters open up at large sizes
5. **Touch targets: 44×44px minimum** on mobile, period

---

## Typography Defaults

| Property | Size Range | Default Value | Rationale |
|---|---|---|---|
| Letter spacing | 56px+ (display) | −0.03em | Counters appear open at large sizes |
| Letter spacing | 32–48px (heading) | −0.015em | Moderate tightening |
| Letter spacing | 14–18px (body) | 0 (normal) | Typefaces optimized here |
| Letter spacing | 10–12px (caption) | +0.015em | Counters close up at small sizes |
| Line height | Body text | 1.5× minimum | WCAG SC 1.4.12 |
| Line height | Headings | 1.1–1.2× | Tighter for visual density |
| Line length | Body text | 45–75 chars (65ch optimal) | Baymard Institute |
| Minimum font size | Any text | 10px | Below 10px is illegible on screen |

### Font Selection Anti-Patterns
- **Don't use overused fonts** without intention: Arial, Inter (as default), system defaults
- **Don't use gray text on colored backgrounds** — always calculate specific contrast
- **Don't use pure black/gray** — always tint toward your brand color family

### Recommended Font Pairings for SaaS/Dashboard
| Use Case | Primary | Mono |
|---|---|---|
| Professional/Clean | DM Sans, Plus Jakarta Sans, Outfit | JetBrains Mono, Fira Code |
| Technical/Developer | Space Grotesk, IBM Plex Sans | JetBrains Mono, IBM Plex Mono |
| Premium/Editorial | Sora, Satoshi, General Sans | Berkeley Mono, Iosevka |

---

## Color Defaults

| Property | Default Value | Rationale |
|---|---|---|
| Disabled opacity | 40% | 50% creates ghosts that compete. 40% recedes fully. (MD3, Workday) |
| Hover lightness delta | 8% minimum | Below 8% is imperceptible on most monitors. (NNGroup) |
| Dark surface body text | `#E2E8F0` or `#F1F5F9` | Pure white on very dark bg causes halation. Headlines can use white. (APCA) |
| Non-text contrast | 3:1 minimum | Icons, borders, form controls vs adjacent color. (WCAG 2.2 SC 1.4.11) |
| Text contrast | 4.5:1 minimum | Body text. Large text (24px+ or 18.66px+ bold): 3:1. (WCAG AA) |

### Color Anti-Patterns
- **Don't use generic purple-to-blue gradients** — they scream "AI-generated"
- **Don't use pure black (#000000)** — use near-black tinted to your palette (e.g., #0F172A for blue-tinted, #1A1A2E for purple-tinted)
- **Don't use gray text on colored backgrounds** — calculate specific contrast ratios
- **Dark mode body text must NOT be pure white (#FFFFFF)** — use `#E2E8F0` or `#F1F5F9` to prevent halation

### MavrykSeo Color Token Reference
```
// Apply these as CSS custom properties
--color-text-dark-body: #E2E8F0;        // Body text on dark bg
--color-text-dark-heading: #FFFFFF;      // Headlines on dark bg (ok to use white)
--color-text-dark-muted: #94A3B8;        // Muted/secondary text on dark bg
--opacity-disabled: 0.4;                 // NOT 0.5
--hover-lightness-delta: 8%;             // Minimum perceptible change
```

---

## Motion Defaults

| Property | Default Value | Rationale |
|---|---|---|
| Duration floor | 100ms | Below this, motion is imperceptible — snap instead |
| Duration standard | 200–300ms | Most UI transitions |
| Duration ceiling | 400ms | Complex choreography only. Never exceed 500ms. |
| Enter easing | `cubic-bezier(0, 0, 0.2, 1)` | Decelerate — arriving elements settle |
| Exit easing | `cubic-bezier(0.4, 0, 1, 1)` | Accelerate — departing elements dismiss |
| Standard easing | `cubic-bezier(0.4, 0, 0.2, 1)` | Within-screen repositioning |

### Motion Anti-Patterns
- **Don't use bounce/elastic easing** — it feels dated and cheap
- **Don't animate everything** — motion should be purposeful
- **Don't exceed 500ms** for any UI transition
- **Below 100ms, don't animate at all** — just snap

### CSS Custom Properties for Motion
```css
:root {
  --ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
}
```

---

## Spacing Defaults

| Property | Default Value | Rationale |
|---|---|---|
| Touch target (mobile) | 44×44px | Apple HIG engineering target |
| Touch target (desktop min) | 24×24px | WCAG 2.2 SC 2.5.8 floor |
| Button height (primary) | 40–44px | Comfortable click target |
| Button height (compact) | 32px | Dense UI, secondary actions |
| Border radius (cards) | 8px max | >8px reads consumer/casual |
| Border radius (buttons) | 6px | Matches card inner radius at 8px outer with 2px offset |
| Focus ring offset | 2px | Ring radius = component radius + 2px (WCAG 2.2 SC 2.4.13) |

### Spacing Scale (8px base)
```
4px  — tight inner padding, icon gaps
8px  — standard gap between related items
12px — form field internal padding
16px — section inner padding, card padding (compact)
24px — card padding (standard), section gaps
32px — major section separation
48px — page-level section separation
64px — hero/feature section breaks
```

### Spacing Anti-Patterns
- **Don't nest cards inside cards** — creates visual noise
- **Don't use inconsistent spacing** — pick a scale and stick to it
- **Don't use cramped padding** — minimum 12px internal padding for any interactive element

---

## Icon Defaults

| Property | Default Value | Rationale |
|---|---|---|
| Minimum size | 16×16px | Below 16px, icons lose clarity at 1x density |
| Stroke weight | 1.5px (standard), 2px (emphasis) | Match text weight hierarchy |
| Optical alignment | Shift circle icons down 1px | Circles appear to float relative to square bounds |
| Touch target padding | Extend to 44×44px with transparent hit area | Icon can be 20px visual, 44px tap target |

---

## Responsive Breakpoints for MavrykSeo

Per AGENTS.md rule #14, all UI must be responsive across:

| Breakpoint | Name | Width | Notes |
|---|---|---|---|
| Mobile | `sm` | < 640px | Single column, 44px touch targets |
| Tablet | `md` | 640px – 1024px | Sidebar collapsible, 2-column grid |
| PC | `lg` | 1024px – 1440px | Full sidebar, standard layout |
| Min-PC | `xl` | 1440px – 1920px | Standard desktop experience |
| Max-PC | `2xl` | > 1920px | Content max-width constraint, larger typography |

### Key Responsive Rules
- **Mobile-first**: Start with mobile layout, enhance upward
- **Sidebar**: Collapsed/hamburger below `md`, visible from `lg`
- **Content max-width**: Never exceed 1280px for main content area
- **Typography scales**: Body 14px mobile → 16px desktop
- **Grid**: 1 col mobile → 2 col tablet → 3-4 col desktop

---

## Dashboard-Specific Defaults (SaaS/SEO Tool)

Since MavrykSeo is a SEO dashboard tool, these specific defaults apply:

### Data Visualization
- **KPI cards**: Use 3-4 per row on desktop, stack on mobile
- **Charts**: Minimum height 200px, prefer line/area for time-series
- **Tables**: Horizontal scroll on mobile, sticky first column
- **Empty states**: Always provide illustration + headline + CTA

### Dashboard Layout
- **Sidebar width**: 240px collapsed to icon-only (64px) below `lg`
- **Header height**: 56-64px
- **Content area padding**: 24px desktop, 16px mobile
- **Card gap**: 16px mobile, 24px desktop

### Common Mistakes in SEO Dashboards
| Mistake | Fix |
|---|---|
| Too many metrics visible at once | Group into tabs or sections, show 3-5 key metrics |
| Dense tables without hierarchy | Use bold for primary column, muted text for secondary |
| Charts without context | Always show comparison (vs previous period, vs target) |
| No loading states | Use skeleton screens, not spinners |
| Full-width everything | Max-width 1280px for content, center on large screens |

---

## Quick Reference Card

```
✅ DO                              ❌ DON'T
─────────────────────────────────  ─────────────────────────────────
Disabled at 40% opacity            50% opacity (competes visually)
Hover delta ≥ 8% lightness         Subtle hover imperceptible on LCD
Body text #E2E8F0 on dark          Pure white (halation)
Letter-spacing −0.03em at 56px+    Default tracking at display sizes
Touch targets 44×44px              Small tap areas on mobile
Transitions 200–300ms              Bounce/elastic easing
Border radius ≤ 8px for cards      Excessive rounding (consumer feel)
Tinted near-black backgrounds      Pure #000000 backgrounds
Purposeful motion                  Animate everything
8px spacing scale                  Arbitrary pixel values
Content max-width 1280px           Full-width stretching on 4K
Skeleton loading states            Spinners everywhere
```
