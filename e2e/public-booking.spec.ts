import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Golden-Path #1: Public-Booking-Seite lädt, zeigt Salon-Namen + FAQ-/
// Services-Sektion an, und axe findet keine WCAG-AA-Verstöße.
//
// Voraussetzung: Seed hat `beautycenter-by-neta` angelegt (siehe
// packages/db/prisma/seed.ts). In CI wird vor `playwright test`
// `db:seed` aufgerufen.

test.describe('Public Booking — Golden Path #1', () => {
  test('Salonseite rendert mit Tenant-Name', async ({ page }) => {
    await page.goto('/book/beautycenter-by-neta');

    // Die Hero-Überschrift enthält den Salon-Namen.
    await expect(
      page.getByRole('heading', { name: /Beautycenter by Neta/i }),
    ).toBeVisible();

    // Mindestens eine Service-Karte wird ausgeliefert.
    await expect(page.getByRole('link', { name: /buchen|wählen/i }).first()).toBeVisible();
  });

  test('axe-core meldet 0 WCAG-AA-Verstöße auf der Booking-Seite', async ({ page }) => {
    await page.goto('/book/beautycenter-by-neta');
    await page.waitForLoadState('networkidle');

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Verletzungen mit Kontext loggen — hilft bei Debugging im CI-Artifact.
    if (result.violations.length > 0) {
      console.error(
        'axe violations:\n' +
          result.violations
            .map((v) => `  - ${v.id} (${v.impact}): ${v.description}`)
            .join('\n'),
      );
    }
    expect(result.violations).toEqual([]);
  });
});
