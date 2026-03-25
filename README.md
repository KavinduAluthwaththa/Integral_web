# Integral Web

Integral Web is a Next.js ecommerce application for premium streetwear, with storefront, customer account flows, admin operations, multi-currency display, and PayHere payment integration.

## Current Product State

- Active UI mode is light theme.
- Design tokens are centralized in global CSS and consumed through Tailwind semantic classes.
- Currency display and checkout payment flows are currency-aware.
- Quality gate used by the project is the strict check script.

## Feature Coverage

- Storefront: home, shop listing, product details, search, cart drawer, checkout.
- Authentication: login, signup, password recovery/reset, email verification.
- Customer dashboard: orders, returns, addresses, favorites, analytics, recently viewed.
- Admin: products, orders, payments, returns, analytics/overview.
- Platform pages: robots, sitemap, newsletter, auth callbacks.

## Tech Stack

- Framework: Next.js 13 (App Router)
- Language: TypeScript
- UI: React, Tailwind CSS, Radix UI, class-variance-authority
- Data/Auth: Supabase
- Payments: PayHere
- Testing: Vitest
- Linting/Type checks: ESLint + TypeScript compiler

## Project Structure

- app: routes, pages, API routes
- components: UI primitives and feature components
- lib: business logic, integrations, contexts, services
- hooks: reusable feature hooks
- supabase/migrations: database migration scripts
- tests: unit and behavior tests

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

Create a local environment file and set the variables listed below.

```bash
cp .env.example .env.local
```

If no example file exists, create `.env.local` manually.

### 3) Run development server

```bash
npm run dev
```

App default URL:

- http://localhost:3000

## Environment Variables

### Supabase

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

### Site and Checkout

- NEXT_PUBLIC_SITE_URL
- NEXT_PUBLIC_ENABLE_DEMO_CARD

### PayHere

- PAYHERE_MERCHANT_ID
- PAYHERE_MERCHANT_SECRET
- PAYHERE_MODE
- PAYHERE_RETURN_URL
- PAYHERE_CANCEL_URL
- PAYHERE_NOTIFY_URL
- PAYHERE_ALERT_WEBHOOK_URL

Notes:

- PAYHERE_MODE typically uses sandbox for local and staging environments.
- If return and cancel URLs are not set, the payment initiation route can derive fallbacks from NEXT_PUBLIC_SITE_URL.

## Available Scripts

```bash
npm run dev          # start local dev server
npm run build        # production build
npm run start        # run production build
npm run lint         # lint checks
npm run typecheck    # TypeScript checks
npm run test         # run tests
npm run test:coverage # run tests with coverage thresholds
npm run test:security # run security-focused unit tests
npm run test:e2e     # run Playwright end-to-end tests
npm run test:e2e:security # run security-focused E2E tests
npm run check        # typecheck + test
npm run check:strict # lint + typecheck + test
npm run check:strict:e2e # lint + typecheck + unit tests + e2e tests
npm run check:strict:coverage:e2e # lint + typecheck + coverage + e2e tests
npm run check:security # lint + typecheck + security tests + security e2e + dependency audit
```

## Quality and Validation

Run the strict pipeline before merge:

```bash
npm run check:strict
```

Run full validation including browser end-to-end coverage:

```bash
npx playwright install chromium
npm run check:strict:e2e
```

## Design System Docs

- Main reference: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)
- Designer handoff: [DESIGN_SYSTEM_DESIGNER_FIRST.md](DESIGN_SYSTEM_DESIGNER_FIRST.md)
- Developer handoff: [DESIGN_SYSTEM_DEVELOPER_FIRST.md](DESIGN_SYSTEM_DEVELOPER_FIRST.md)
- Product handoff: [DESIGN_SYSTEM_PRODUCT_FIRST.md](DESIGN_SYSTEM_PRODUCT_FIRST.md)

## Deployment Notes

- Netlify configuration exists in netlify.toml.
- Ensure PayHere webhook URL is reachable in deployed environments.
- Ensure Supabase keys are correctly scoped per environment.

## Contribution Checklist

Before opening a PR:

1. Run npm run check:strict
2. Verify key storefront and checkout flows manually
3. Keep UI changes aligned with semantic token usage
4. Update documentation when behavior or architecture changes
