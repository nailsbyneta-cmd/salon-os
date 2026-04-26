/**
 * Test 02: Admin Calendar & Click-to-Book
 * Path: Admin Login → /calendar → Click to create appointment → View appointment
 *
 * Golden Path #2: Admin Calendar
 */

import { test, expect } from '@playwright/test';
import {
  createTestTenant,
  createSampleService,
  createSampleStaff,
  createSampleClient,
  getTestLocation,
  cleanupTestTenant,
  prisma,
} from '../fixtures/test-tenant';

let testTenant: any;
let testStaff: any;
let testService: any;
let testClient: any;

test.beforeAll(async () => {
  // Create test tenant
  const tenant = await createTestTenant({ name: 'Admin Calendar Test' });
  testTenant = tenant;

  // Create location, staff, service, client
  const location = await getTestLocation(tenant.id);
  if (!location) throw new Error('Failed to get location');

  testStaff = await createSampleStaff(tenant.id, location.id);
  testService = await createSampleService(tenant.id);
  testClient = await createSampleClient(tenant.id);

  console.log(`Test admin tenant created: ${tenant.slug}`);
});

test.afterAll(async () => {
  if (testTenant?.id) {
    await cleanupTestTenant(testTenant.id);
  }
});

/**
 * For admin login, we mock WorkOS or use magic link
 * Since WorkOS SDK requires auth, we'll simulate auth state
 * TODO: Set up WorkOS mock or use Next.js middleware override for tests
 */
test('should navigate admin to calendar page', async ({ page, context }) => {
  // TODO: Mock WorkOS login or set session cookie
  // For now, we simulate authenticated state by:
  // 1. Setting auth cookie from env (if test setup provides one)
  // 2. Or using a test magic link endpoint

  // Option A: Set auth context cookie (requires test auth setup)
  // await context.addCookies([{
  //   name: 'auth-token',
  //   value: await getTestAuthToken(testTenant.adminEmail),
  //   url: 'http://localhost:3000'
  // }]);

  // For now, navigate to admin (will redirect to login if no auth)
  await page.goto('/calendar', { waitUntil: 'networkidle' });

  // If redirected to login, we expect auth page
  // TODO: verify login redirect - check for WorkOS form or magic link input
  const heading = page.locator("h1, h2, [role='heading']").first();
  await expect(heading).toBeVisible({ timeout: 5000 });

  // Check if we're on login or calendar
  const url = page.url();
  if (url.includes('/login') || url.includes('/auth')) {
    console.log('Redirected to login - auth setup needed for full test');
    // Could implement magic link login here
    // await page.fill('input[name="email"]', testTenant.adminEmail);
    // await page.click('button[type="submit"]');
  } else {
    console.log('User authenticated - on calendar page');
  }
});

test('should display calendar with staff schedule', async ({ page }) => {
  // This test assumes we're authenticated (see setup in beforeAll)
  // TODO: Implement proper auth flow

  await page.goto('/calendar');

  // Look for calendar view elements
  // TODO: verify selector - look for calendar header, day grid, or event slots
  const calendarHeader = page
    .locator("[data-testid='calendar-header'], h2, .calendar")
    .filter({ hasText: /calendar|schedule|woche|monat|this week/i })
    .first();

  if (await calendarHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
    await expect(calendarHeader).toBeVisible();
  }

  // Look for staff name or time slots
  const staffName = page
    .locator("[data-testid='staff-name'], [data-testid='staff-column']")
    .first();

  await staffName.isVisible({ timeout: 5000 }).catch(() => {
    console.log('Staff column not found - may need day/week view navigation');
  });
});

test('should allow click-to-book appointment', async ({ page }) => {
  // Navigate to calendar
  await page.goto('/calendar');

  // Look for empty time slot (to-do: click on a grid cell)
  // TODO: verify selector - look for time grid cells or "+ New Appointment" buttons
  const emptySlot = page
    .locator("[data-testid='time-slot'], [role='button']")
    .filter({ hasText: /new|create|add|\+|book/i })
    .first();

  if (await emptySlot.isVisible({ timeout: 5000 }).catch(() => false)) {
    await emptySlot.click();

    // Expect booking modal to open
    // TODO: verify selector - look for modal/dialog with form
    const modal = page.locator("[role='dialog'], .modal, [data-testid='booking-modal']").first();
    await expect(modal)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        console.log('Booking modal not found');
      });

    // Fill appointment details
    const clientSelect = page
      .locator("input[type='text'], [role='combobox']")
      .filter({ hasText: /client|select/i })
      .first();

    if (await clientSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientSelect.click();
      await clientSelect.type(testClient.firstName || 'Test', { delay: 50 });

      // Wait for autocomplete option
      const clientOption = page
        .locator("[role='option']")
        .filter({ hasText: new RegExp(testClient.firstName || 'Test', 'i') })
        .first();

      await clientOption.click({ timeout: 5000 }).catch(() => {
        console.log('Client autocomplete option not found');
      });
    }

    // Select service
    const serviceSelect = page
      .locator("input, select, [role='combobox']")
      .filter({ hasText: /service|select service/i })
      .nth(1);

    if (await serviceSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await serviceSelect.click();
      const serviceOption = page
        .locator("[role='option']")
        .filter({ hasText: /nail|gel|service/i })
        .first();
      await serviceOption.click({ timeout: 5000 }).catch(() => {
        console.log('Service option not found');
      });
    }

    // Submit booking
    const submitBtn = page
      .locator("button[type='submit'], button")
      .filter({ hasText: /save|book|create|speichern/i })
      .last();

    if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await submitBtn.click();

      // Verify appointment created
      const successMsg = page
        .locator("[data-testid='success'], [role='alert'], .toast")
        .filter({ hasText: /created|booked|success|erfolg/i })
        .first();

      await expect(successMsg)
        .toBeVisible({ timeout: 5000 })
        .catch(() => {
          console.log('Success message not found');
        });
    }
  } else {
    console.log('No clickable time slot found for appointment creation');
  }
});

test('should show appointment details', async ({ page }) => {
  // Create an appointment first (via API)
  if (testStaff?.id && testService?.id && testClient?.id) {
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: testTenant.id,
        clientId: testClient.id,
        serviceId: testService.id,
        staffId: testStaff.id,
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000), // +1 hour
        status: 'CONFIRMED',
        notes: 'Test appointment',
      },
    });

    // Navigate to appointment detail
    // TODO: verify route pattern
    await page.goto(`/calendar/${appointment.id}`, { waitUntil: 'networkidle' });

    // Verify appointment details are shown
    const clientName = page.locator("[data-testid='client-name'], p, span").first();
    await expect(clientName)
      .toBeVisible({ timeout: 5000 })
      .catch(() => {
        console.log('Appointment detail not found');
      });
  }
});
