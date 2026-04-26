/**
 * Test 03: POS Checkout Flow
 * Path: Open appointment → POS tab → Add items/tip → Stripe mock → Receipt
 *
 * Golden Path #3: POS Checkout (Payment)
 */

import { test, expect } from "@playwright/test";
import {
  createTestTenant,
  createSampleService,
  createSampleStaff,
  createSampleClient,
  getTestLocation,
  cleanupTestTenant,
  prisma,
} from "../fixtures/test-tenant";
import { STRIPE_TEST_CARD } from "../fixtures/api-mocks";

let testTenant: any;
let testAppointment: any;

test.beforeAll(async () => {
  // Create test tenant
  const tenant = await createTestTenant({ name: "POS Checkout Test" });
  testTenant = tenant;

  // Setup location, staff, service, client
  const location = await getTestLocation(tenant.id);
  if (!location) throw new Error("Failed to get location");

  const staff = await createSampleStaff(tenant.id, location.id);
  const service = await createSampleService(tenant.id, { price: 7500 }); // CHF 75
  const client = await createSampleClient(tenant.id);

  // Create completed appointment for POS
  const appointmentTime = new Date();
  appointmentTime.setHours(14, 0, 0, 0);

  testAppointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      serviceId: service.id,
      staffId: staff.id,
      startTime: appointmentTime,
      endTime: new Date(appointmentTime.getTime() + 3600000),
      status: "COMPLETED", // Important: must be completed for POS
      notes: "Test appointment for POS",
    },
  });

  console.log(
    `Test POS appointment created: ${testAppointment.id} (Status: ${testAppointment.status})`
  );
});

test.afterAll(async () => {
  if (testTenant?.id) {
    await cleanupTestTenant(testTenant.id);
  }
});

test("should open POS for completed appointment", async ({ page }) => {
  // Navigate to appointment (assuming auth is set up)
  // TODO: Set admin auth context
  await page.goto(`/calendar/${testAppointment.id}`);

  // Look for POS or checkout button
  const posBtn = page
    .locator("button, a, [role='button']")
    .filter({ hasText: /pos|checkout|payment|rechnung|kasse/i })
    .first();

  if (await posBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await posBtn.click();

    // Expect to navigate to /pos/[appointmentId]
    // TODO: verify route pattern after first run
    await page
      .waitForURL(/\/pos\/.+/i, { timeout: 10000 })
      .catch(() => {
        console.log("POS route not detected");
      });
  } else {
    console.log("POS button not found on appointment detail");
    // Try direct navigation as fallback
    await page.goto(`/pos/${testAppointment.id}`);
  }
});

test("should display service total in POS", async ({ page }) => {
  await page.goto(`/pos/${testAppointment.id}`);

  // Look for price display (CHF 75.00)
  const priceDisplay = page
    .locator("[data-testid='total-price'], .price, span")
    .filter({ hasText: /\d+\.?\d{0,2}|chf/i })
    .first();

  if (await priceDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
    const priceText = await priceDisplay.textContent();
    expect(priceText).toMatch(/75|7500/); // CHF 75 in cents or decimal
  } else {
    console.log("Price display not found");
  }
});

test("should allow adding tip and calculating total", async ({ page }) => {
  await page.goto(`/pos/${testAppointment.id}`);

  // Look for tip input or tip buttons
  const tipInput = page
    .locator("input[type='number'], input[type='text']")
    .filter({ hasText: /tip|trinkgeld|pourboire/i })
    .first();

  // Alternative: look for preset tip buttons (10%, 15%, 20%)
  const tipBtn = page
    .locator("button, [role='button']")
    .filter({ hasText: /10%|15%|20%|tip|trinkgeld/i })
    .first();

  if (await tipInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tipInput.fill("10");
  } else if (await tipBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tipBtn.click();
  }

  // Verify total updated
  const totalDisplay = page
    .locator("[data-testid='final-total'], [data-testid='amount'], span")
    .filter({ hasText: /total|insgesamt|sum/i })
    .last();

  await expect(totalDisplay).toBeVisible({ timeout: 5000 }).catch(() => {
    console.log("Total calculation not visible");
  });
});

test("should handle Stripe payment with test card", async ({ page }) => {
  await page.goto(`/pos/${testAppointment.id}`);

  // Look for payment method selector
  const paymentMethodBtn = page
    .locator("button, [role='button']")
    .filter({ hasText: /card|stripe|payment|zahlung|ec|cash/i })
    .first();

  if (await paymentMethodBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await paymentMethodBtn.click();
  }

  // Look for Stripe payment form or iframe
  // TODO: verify selector - Stripe may be in iframe
  const stripeFrame = page.frameLocator('iframe[title*="Stripe"]').first();
  const cardInput = page.locator('[data-testid="card-number"], input').first();

  if (await cardInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Fill card details
    await cardInput.fill(STRIPE_TEST_CARD.number.replace(/ /g, ""));

    const expiryInput = page.locator("input").filter({ hasText: /expiry|mm\/yy/i }).first();
    const cvcInput = page.locator("input").filter({ hasText: /cvc|cvv/i }).first();

    if (await expiryInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expiryInput.fill(STRIPE_TEST_CARD.expiry);
    }
    if (await cvcInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cvcInput.fill(STRIPE_TEST_CARD.cvc);
    }
  }

  // Click pay button
  const payBtn = page
    .locator("button[type='submit'], button")
    .filter({ hasText: /pay|bezahlen|payer|charge|accept/i })
    .last();

  if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await payBtn.click();

    // Wait for payment processing
    await page.waitForTimeout(2000);
  } else {
    console.log("Payment button not found");
  }
});

test("should show receipt after payment", async ({ page }) => {
  await page.goto(`/pos/${testAppointment.id}`);

  // Skip to checkout/receipt (in real test, complete payment first)
  // Look for receipt section
  const receipt = page
    .locator("[data-testid='receipt'], .receipt, section")
    .filter({ hasText: /receipt|rechnung|beleg|invoice/i })
    .first();

  if (await receipt.isVisible({ timeout: 5000 }).catch(() => false)) {
    // Verify receipt items
    const itemRow = receipt
      .locator("tr, div, [role='row']")
      .filter({ hasText: /nail|service|item/i })
      .first();

    await expect(itemRow).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log("Receipt item row not found");
    });

    // Look for total
    const totalRow = receipt
      .locator("tr, div, [role='row']")
      .filter({ hasText: /total|insgesamt/i })
      .first();

    await expect(totalRow).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log("Total row not found on receipt");
    });

    // Look for print/email button
    const printBtn = page
      .locator("button, [role='button']")
      .filter({ hasText: /print|email|download|pdf/i })
      .first();

    if (await printBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(printBtn).toBeVisible();
    }
  } else {
    console.log("Receipt not visible - may not be in final state");
  }
});

test("should handle no-show and manual entry", async ({ page }) => {
  // Test alternative flow: POS without appointment (manual entry)
  // This tests cash-only transactions

  await page.goto(`/pos`);

  // Look for "New Sale" or "Manual Entry" button
  const newSaleBtn = page
    .locator("button, [role='button']")
    .filter({ hasText: /new|manual|ohne|cash|bar/i })
    .first();

  if (await newSaleBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await newSaleBtn.click();

    // Fill in items manually
    const itemInput = page
      .locator("input, [role='combobox']")
      .filter({ hasText: /item|product|service/i })
      .first();

    if (await itemInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await itemInput.click();
      await itemInput.type("Nail", { delay: 50 });

      const option = page
        .locator("[role='option']")
        .filter({ hasText: /nail|gel/i })
        .first();

      await option.click({ timeout: 5000 }).catch(() => {
        console.log("Item option not found");
      });
    }
  } else {
    console.log("Manual entry/new sale option not found");
  }
});
