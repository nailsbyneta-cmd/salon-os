/**
 * API Mock Fixtures for E2E Tests
 * Intercepts and mocks Stripe, Postmark, Twilio responses
 */

import { Page } from "@playwright/test";

/**
 * Mock Stripe payment API
 */
export async function mockStripePayment(page: Page) {
  // Intercept POST requests to Stripe API
  await page.route("**/api/**/stripe/**", (route) => {
    const request = route.request();

    if (request.postDataJSON()?.intent === "pay") {
      route.abort("blockedbyclient");
      // In real scenario, you'd return a mock success response
      // For now, tests use test mode Stripe tokens
    } else {
      route.continue();
    }
  });
}

/**
 * Mock Postmark email API
 * Simulates email send responses
 */
export async function mockPostmarkEmail(page: Page) {
  await page.route("**/api/**/postmark/**", (route) => {
    route.abort("blockedbyclient");
  });

  // Optionally intercept and log email sends for verification
  await page.on("console", (msg) => {
    if (msg.text().includes("email")) {
      console.log("Email mock:", msg.text());
    }
  });
}

/**
 * Mock Twilio SMS API
 * Simulates SMS send responses
 */
export async function mockTwilioSms(page: Page) {
  await page.route("**/api/**/twilio/**", (route) => {
    route.abort("blockedbyclient");
  });
}

/**
 * Mock all external integrations
 * Call this in beforeEach hook to isolate tests from external APIs
 */
export async function mockAllExternalApis(page: Page) {
  await mockStripePayment(page);
  await mockPostmarkEmail(page);
  await mockTwilioSms(page);
}

/**
 * Test Stripe card token (from Stripe test mode)
 * Use this in POS/payment tests
 */
export const STRIPE_TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12/26",
  cvc: "123",
};

/**
 * Test phone number for SMS (E.164 format)
 */
export const TEST_PHONE_E164 = "+41791234567";

/**
 * Test email for mail mocking
 */
export const TEST_EMAIL = "test-e2e@salon-os.dev";
