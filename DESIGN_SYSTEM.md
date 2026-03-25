# Integral Web Design System

Comprehensive, implementation-aligned design system for Integral, a Next.js streetwear ecommerce application.

## Document Purpose

- Define one shared design language for product, design, and engineering.
- Preserve visual and behavioral consistency across storefront, dashboard, and admin.
- Capture real implementation constraints from the current codebase.
- Serve as the single handoff document for design decisions and UI implementation.

## Scope and Product Reality

- This document reflects what is currently built and expected in production.
- Public UI currently ships as light theme only.
- A dark token block exists in CSS for future support, but dark mode is not currently exposed as a user feature.
- Theme and behavior source of truth lives in:
	- app/globals.css
	- tailwind.config.ts
	- components/ui/*

## Product Surfaces

Integral currently includes these surfaces:

- Storefront: home, shop listing, product detail, cart drawer, checkout.
- Authentication: login, signup, forgot/reset password, verify email.
- Customer dashboard: orders, returns, addresses, favorites, recently viewed, analytics.
- Admin: orders, products, returns, payments, overview analytics.
- Platform utilities: robots, sitemap, newsletter, auth callbacks, payment APIs.

## Brand and Visual Direction

### Design Intent

- Minimal, editorial, premium streetwear feel.
- Visual confidence through whitespace and strong framing.
- Warm charcoal on white for readability and tone.
- Olive accent used sparingly for action and emphasis.
- Square geometry communicates structure and precision.

### Core Principles

- Product first: visuals should support product discovery and purchase clarity.
- Low noise: avoid decorative elements that compete with core actions.
- Consistent hierarchy: display typography for section framing, neutral body typography for detail.
- Reliable interactions: controls should behave predictably across viewport sizes.

## Theme System

### Active Theme

- Active runtime theme is the light token set in :root.

### Active Token Values

- background: hsl(0 0% 100%)
- foreground: hsl(345 6% 28%)
- card: hsl(0 0% 100%)
- card-foreground: hsl(345 6% 28%)
- popover: hsl(0 0% 100%)
- popover-foreground: hsl(345 6% 28%)
- primary: hsl(345 6% 28%)
- primary-foreground: hsl(0 0% 100%)
- secondary: hsl(345 6% 96%)
- secondary-foreground: hsl(345 6% 35%)
- muted: hsl(345 6% 92%)
- muted-foreground: hsl(345 4% 45%)
- accent: hsl(75 40% 45%)
- accent-foreground: hsl(0 0% 100%)
- destructive: hsl(0 84.2% 60.2%)
- destructive-foreground: hsl(0 0% 100%)
- border: hsl(345 6% 86%)
- input: hsl(345 6% 95%)
- ring: hsl(75 40% 45%)
- radius: 0

### Color Application Rules

- Use background/card for page and container surfaces.
- Use foreground for primary text and iconography.
- Use muted and secondary for supporting surfaces and low-emphasis labels.
- Use accent for CTA emphasis, active states, and focus ring identity.
- Use destructive only for critical warning or destructive actions.

### Prohibited Usage

- Do not introduce hardcoded hex values when semantic tokens exist.
- Do not use accent as large decorative fill.
- Do not replace warm charcoal with pure black unless explicitly required.

## Typography System

### Font Families

- Body: Inter
- Display: Space Mono

### Type Scale

- xs: 0.75rem
- sm: 0.875rem
- base: 1rem
- lg: 1.125rem
- xl: 1.25rem
- 2xl: 1.5rem
- 3xl: 1.875rem
- 4xl: 2.25rem
- 5xl: 3rem

### Semantic Typography Rules

- h1-h6: display family, bold, uppercase.
- h1: text-5xl with tight leading.
- h2: text-4xl with snug leading.
- Body paragraphs: leading-relaxed for reading comfort.
- Small UI metadata: uppercase tracking pattern may be used for labels and utility text.

## Layout, Spacing, and Geometry

### Spacing Scale

- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)
- 3xl: 4rem (64px)
- 4xl: 6rem (96px)

### Container Rules

- Base container max width: 7xl.
- Default horizontal padding: md token.
- Major section spacing typically ranges from xl to 4xl.

### Breakpoint Expectations

- Mobile-first composition.
- Tablet and desktop layouts progressively increase density while preserving readability.
- Navigation, grids, and utility filters must have explicit mobile and desktop behaviors.

### Shape Rules

- Global radius token is 0.
- Square corners are the default visual grammar.
- Any rounded treatment is an exception and must be intentional.

## Component Standards

### Button

Variants:

- default: foreground background with background text.
- outline: 2px foreground border, hover inversion.
- ghost: transparent base, hover foreground fill.
- accent: olive base, hover shifts to foreground style.

Sizes:

- sm: h-9
- default: h-10
- lg: h-11
- icon: h-10 w-10

Interaction requirements:

- Focus-visible styles must remain enabled.
- Disabled states must visibly communicate non-interactive state.

### Input and Select Controls

- Token-driven surfaces and border usage.
- Square framing and consistent spacing.
- Focus states must be visible and high-contrast.
- Placeholder and hint text should use muted-foreground tone.

### Navigation

- Sticky top layout with strong border framing.
- Distinct desktop and mobile compositions are expected.
- Primary action affordances include cart, favorites, and account.
- Navigation labels should remain concise and scannable.

### Product Cards and Grids

- Image-led presentation with clean framing.
- Product metadata should be short and easy to scan.
- Grid density should prioritize readability over maximum item count.
- Price output must use shared currency display logic.

### Modal and Drawer Patterns

- Used for high-focus actions (search, cart, dialogs).
- Must preserve keyboard focus behavior and close affordances.
- Visual style should remain consistent with global token language.

### Checkout Surface

- Flow is sequential: shipping, payment, confirmation.
- Pricing sections must remain clear and grouped.
- Payment redirect context must explicitly state gateway charge currency.
- Validation and error states should prioritize clarity and recovery.

### Dashboard and Admin Surfaces

- Dense information requires strict readability and spacing discipline.
- Data hierarchy should emphasize status and next actions.
- Token usage should match storefront system for cross-surface consistency.

## Motion and Interaction

- Motion should support state transitions, not decoration.
- Available base animations include fade-in and accordion transitions.
- Hover behavior can use subtle contrast inversion and scale shifts.
- Transition durations should feel responsive and avoid visual drag.

## Accessibility Standards

### Baseline Requirements

- Semantic HTML and landmark roles across templates.
- Visible focus indicators for all interactive controls.
- Support for keyboard navigation paths.
- Screen-reader-only utility pattern for hidden descriptive text.
- Maintain WCAG AA color contrast for text and controls.

### Accessibility QA Checklist

- Can all interactive elements be reached and used via keyboard?
- Are focus states visible on light surfaces and border-heavy components?
- Are icon-only controls labeled with meaningful aria-label text?
- Do forms expose clear labels, helper text, and error messages?

## Currency and Payment UX Standards

### Currency Display

- Product and checkout amounts must use shared currency display utilities.
- Currency output should avoid duplicate suffix or code repetition.
- Display currency must align with selected user currency context.

### Payment Flow Clarity

- Checkout must show gateway charge currency before redirect.
- Payment initiation and callback validation must stay currency-consistent.
- Any payment failure messaging should be specific and actionable.

## Content and Microcopy Guidelines

- Keep copy concise, direct, and commerce-focused.
- Avoid vague labels in high-stakes actions (pay, confirm, remove, submit).
- Use confirmation language that reinforces trust during checkout.
- Keep error copy informative and recovery oriented.

## Engineering Implementation Rules

- Prefer semantic Tailwind classes: bg-background, text-foreground, border-border, etc.
- Reuse existing UI primitives before creating custom one-off styling.
- Keep component APIs consistent with existing variant and size patterns.
- Avoid style drift between storefront and admin unless intentionally required.
- Preserve square geometry and display typography conventions where already established.

## Quality Gates and Release Checks

Before merging design-impacting changes:

- npm run lint
- npm run typecheck
- npm run test
- npm run check:strict

Definition of done for UI changes:

- Matches token system and typography hierarchy.
- Keeps accessibility standards intact.
- Preserves currency and checkout clarity expectations.
- Passes strict checks without introducing regressions.

## Change Management

- Update this document whenever token values, component behavior, or UX rules change.
- If a rule is intentionally broken for a feature, document the exception and rationale.
- Keep references aligned with real source files after refactors.

## Out of Scope for Current Version

- Public dark-mode toggle and full dual-theme production support.
- Major visual rebrand away from current editorial minimal identity.
- Alternative color systems that bypass semantic tokens.

## Source of Truth Files

- app/globals.css
- tailwind.config.ts
- components/ui/button.tsx
- components/navigation/navbar.tsx
- app/layout.tsx
- app/shop/page.tsx
- app/checkout/page.tsx
