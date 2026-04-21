import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Golden-Path #2: Login via Magic-Link.
//
// Voraussetzungen (CI setzt das so):
//   - API läuft mit `AUTH_DEV_BYPASS_CODE=123456`, `WORKOS_COOKIE_PASSWORD=<≥32>`
//   - Seed hat einen User mit Email `lorenc@beautyneta.ch` + Membership
//     im Tenant `beautycenter-by-neta`
//
// Der Test umgeht den echten WorkOS-Roundtrip über den Dev-Bypass-Code.

const DEV_CODE = '123456';
const DEV_EMAIL = 'lorenc@beautyneta.ch';

test.describe('Login — Golden Path #2', () => {
  test('Happy-Path: E-Mail → Code → Session-Cookie gesetzt', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /SALON OS/i })).toBeVisible();

    await page.getByTestId('login-email').fill(DEV_EMAIL);
    await page.getByRole('button', { name: /Login-Link senden/i }).click();

    await expect(page.getByText(/Wir haben einen Code an/i)).toBeVisible();
    await page.getByTestId('login-code').fill(DEV_CODE);
    await page.getByTestId('login-submit-code').click();

    // Nach erfolgreichem Exchange navigiert die Form zu "/".
    // Wir brechen hier ab, da "/" hinter Basic-Auth liegen KANN.
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 10_000 });

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'salon_session')).toBeTruthy();
  });

  test('axe-core: Login-Seite hat 0 WCAG-AA-Verstöße', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

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

  test('Fehlerhafter Code → Form zeigt Fehler + Shake', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-email').fill(DEV_EMAIL);
    await page.getByRole('button', { name: /Login-Link senden/i }).click();
    await page.getByTestId('login-code').fill('999999');
    await page.getByTestId('login-submit-code').click();

    await expect(page.getByText(/Code akzeptiert nicht/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
