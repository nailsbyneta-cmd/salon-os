# Playwright E2E Tests — Salon OS

End-to-end test suite covering the 5 golden paths of Salon OS.

## Quick Start

### Prerequisites

- Node.js 22.12.0+
- pnpm 9.15.0+
- Docker (for local Postgres/Redis)

### Setup

```bash
# Install dependencies (includes @playwright/test)
pnpm install

# Start local test database
pnpm db:up

# Run database migrations
cd packages/db && pnpm prisma migrate deploy

# Install Playwright browsers (one-time)
pnpm exec playwright install --with-deps
```

### Running Tests

```bash
# Run all E2E tests (headless, parallel)
pnpm test:e2e

# Run with UI mode (interactive, visual debugging)
pnpm test:e2e:ui

# Run with visible browser (headed mode)
pnpm test:e2e:headed

# Run in debug mode (Inspector + DevTools)
pnpm test:e2e:debug

# Run specific test file
pnpm test:e2e playwright/tests/01-public-booking.spec.ts

# Run specific test by name
pnpm test:e2e -g "should complete public booking flow"
```

## Test Coverage (Golden Paths)

### 1. Public Booking (`01-public-booking.spec.ts`)

- Navigate to `/book/[salon-slug]`
- Select service
- Pick time slot
- Fill booking form (name, email, phone)
- Submit booking
- See success confirmation

**Tests:**

- ✓ Complete booking flow
- ✓ Validation errors for incomplete form
- ✓ Handling unavailable slots

### 2. Admin Calendar (`02-admin-calendar.spec.ts`)

- Admin login (WorkOS or magic link)
- Navigate to `/calendar`
- View staff schedule
- Click to create appointment (click-to-book)
- Select client + service + time
- Save appointment
- View appointment details

**Tests:**

- ✓ Admin authentication redirect
- ✓ Calendar display with staff schedule
- ✓ Click-to-book appointment creation
- ✓ Appointment detail view

### 3. POS Checkout (`03-pos-checkout.spec.ts`)

- Navigate to completed appointment
- Open POS interface
- View service total
- Add tip
- Select payment method
- Enter Stripe card (test mode)
- Show receipt

**Tests:**

- ✓ POS for completed appointment
- ✓ Service total display
- ✓ Tip calculation
- ✓ Stripe payment integration
- ✓ Receipt generation
- ✓ Manual entry (no-show handling)

### 4. CSV Import (`04-csv-import.spec.ts`)

- Navigate to `/settings` or `/clients/import`
- Upload CSV file (clients)
- Preview data
- Confirm import
- Verify clients in database

**Tests:**

- ✓ CSV import page navigation
- ✓ File upload + preview
- ✓ Import confirmation
- ✓ Database verification
- ✓ Duplicate detection
- ✓ Invalid CSV format handling

### 5. Audit & DSGVO (`05-audit-dsgvo.spec.ts`)

- Navigate to `/audit`
- View audit log
- Filter by action type
- Export DSGVO data for client
- Verify JSON export
- Request data deletion

**Tests:**

- ✓ Audit log display
- ✓ Filter audit by action
- ✓ DSGVO export download
- ✓ Export data verification
- ✓ Audit detail modal
- ✓ DSGVO deletion request
- ✓ Access logging

## Architecture

### Files & Structure

```
playwright/
├── tests/
│   ├── 01-public-booking.spec.ts    # Public booking flow
│   ├── 02-admin-calendar.spec.ts    # Admin calendar & click-to-book
│   ├── 03-pos-checkout.spec.ts      # POS & payment
│   ├── 04-csv-import.spec.ts        # CSV import
│   └── 05-audit-dsgvo.spec.ts       # Audit & DSGVO
├── fixtures/
│   ├── test-tenant.ts               # Test data creation (Prisma)
│   └── api-mocks.ts                 # Stripe/Postmark/Twilio mocks
├── README.md                         # This file
└── .gitignore

playwright.config.ts                  # Config (baseURL, browsers, webServer hook)
.github/workflows/e2e.yml            # CI/CD pipeline
```

### Fixtures

**`test-tenant.ts`** — Database setup helpers:

- `createTestTenant()` — Create isolated test tenant
- `createSampleStaff()` — Create test stylist
- `createSampleService()` — Create test service
- `createSampleClient()` — Create test customer
- `cleanupTestTenant()` — Soft-delete tenant

**`api-mocks.ts`** — External API mocking:

- `mockStripePayment()` — Intercept Stripe calls
- `mockPostmarkEmail()` — Mock email sends
- `mockTwilioSms()` — Mock SMS sends
- `mockAllExternalApis()` — Setup all mocks

### Key Selectors (TODO Items)

Some selectors are marked as TODO because they depend on final component implementation:

| Test | Element      | Current Selector                      | TODO                          |
| ---- | ------------ | ------------------------------------- | ----------------------------- |
| 01   | Service card | `[data-testid='service-card']`        | Verify after first run        |
| 01   | Time slot    | `[data-testid='time-slot']`           | Look for time pill pattern    |
| 02   | Calendar     | `[data-testid='calendar-header']`     | Check layout (day/week/month) |
| 03   | POS button   | Filter by `/pos\|checkout\|payment/i` | Route pattern may vary        |
| 04   | File input   | `input[type="file"]`                  | Standard HTML input           |
| 05   | Audit table  | `[data-testid='audit-log']`           | May be paginated              |

### Authentication Strategy

Tests assume:

1. **Public booking** — No auth required (`/book/[slug]`)
2. **Admin paths** — Redirects to login if not authenticated
   - Currently: Expect auth error or login redirect
   - TODO: Implement WorkOS magic link mock or set `auth-token` cookie

For admin tests to fully pass, you need one of:

- Mock WorkOS login endpoint
- Set auth cookie before test
- Use magic link login flow

## Environment Variables

Create `.env.test` in repo root:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/salon_os_test
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/salon_os_test

# Redis
REDIS_URL=redis://localhost:6379

# Playwright
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/e2e.yml`):

- Runs on every push to `main` / `develop`
- Runs on every pull request
- Starts Postgres + Redis services
- Runs database migrations
- Installs Playwright
- Executes all tests in parallel (1 worker in CI)
- Uploads artifact with HTML report
- Comments on PR with result

**To run locally as in CI:**

```bash
# Full CI simulation
docker compose -f infra/docker/docker-compose.yml up -d
pnpm install && pnpm exec playwright install --with-deps
DATABASE_URL=postgresql://... pnpm test:e2e
```

## Troubleshooting

### Test hangs at "waiting for dev server"

```bash
# Manual dev server in another terminal
pnpm dev

# Then run tests with reused server
PLAYWRIGHT_REUSE_SERVER=true pnpm test:e2e
```

### Element not found / selector fails

1. Run in UI mode: `pnpm test:e2e:ui`
2. Inspect the element in Playwright Inspector
3. Update selector in test file
4. Mark resolved TODO as verified

### Database errors

```bash
# Reset test DB
pnpm db:reset
cd packages/db && pnpm prisma migrate deploy
```

### Playwright browsers missing

```bash
pnpm exec playwright install --with-deps
```

### Auth failures on admin tests

Check that your login flow is available:

- Is WorkOS configured?
- Is magic link endpoint working?
- Do you have test credentials?

See `02-admin-calendar.spec.ts` comments for auth setup.

## Performance & Best Practices

- **Parallel execution:** 4 workers by default (adjustable in `playwright.config.ts`)
- **Retries:** 2 retries in CI (0 locally)
- **Screenshots:** Only on failure
- **Traces:** On first retry (for debugging)
- **Timeouts:** 30 min overall, 5 sec element waits

## Extending Tests

To add a new golden path test:

1. Create `playwright/tests/0X-feature-name.spec.ts`
2. Import fixtures from `../fixtures/test-tenant.ts`
3. Use `test.beforeAll()` to set up data
4. Use `test.afterAll()` to cleanup
5. Write test cases with descriptive names
6. Mark unknowns as `// TODO: verify selector after first run`
7. Run locally: `pnpm test:e2e playwright/tests/0X-*.spec.ts`

Template:

```typescript
import { test, expect } from '@playwright/test';
import { createTestTenant, cleanupTestTenant } from '../fixtures/test-tenant';

let testTenant: any;

test.beforeAll(async () => {
  const tenant = await createTestTenant({ name: 'Feature Test' });
  testTenant = tenant;
});

test.afterAll(async () => {
  if (testTenant?.id) await cleanupTestTenant(testTenant.id);
});

test('should do something', async ({ page }) => {
  await page.goto('/some-path');
  const element = page.locator("[data-testid='element']");
  await expect(element).toBeVisible();
});
```

## Reporting

HTML report generated in `playwright-report/`:

- Open `index.html` in browser
- View each test with videos + screenshots
- CI uploads as artifact

## Future Improvements

- [ ] WorkOS login mock for admin tests
- [ ] Payment webhook simulation
- [ ] Multi-language test variants (de, fr, it)
- [ ] Visual regression testing (Chromatic)
- [ ] Performance budgets (Lighthouse)
- [ ] Accessibility checks (axe)
- [ ] Load testing variant

---

**Last Updated:** 2026-04-25  
**Maintained by:** Salon OS Development Team
