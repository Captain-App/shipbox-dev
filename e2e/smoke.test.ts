import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Shipbox/);
});

test('shows login page when unauthenticated', async ({ browser }) => {
  // Create a new context without the stored auth state
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  
  await page.goto('/');
  await expect(page.getByText(/Shipbox/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter the Castle/i })).toBeVisible();
  
  await context.close();
});

// Tests below run with authenticated session (from setup project)
test.describe('Authenticated User', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/sessions', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/billing/balance', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify({ balanceCredits: 5000 }),
      });
    });
    await page.route('**/settings/api-keys', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify({ anthropicHint: '***1234' }),
      });
    });
    await page.route('**/github/status', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });
    await page.route('**/box-secrets', async (route) => {
      await route.fulfill({ 
        status: 200, 
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('can view dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Should show the main layout (not login)
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible();
  });

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/');
    
    // Click settings in sidebar
    await page.locator('button').filter({ hasText: /Settings/i }).first().click();
    await expect(page.getByText(/Settings/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('can navigate to billing', async ({ page }) => {
    await page.goto('/');
    
    // Click billing in sidebar
    await page.locator('button').filter({ hasText: /Billing/i }).first().click();
    await expect(page.getByText(/Balance/i)).toBeVisible({ timeout: 10000 });
  });

  test('can open create sandbox modal', async ({ page }) => {
    await page.goto('/');
    
    // Click "Boxes" in sidebar to ensure we are in a state where we can see the create button
    await page.locator('button').filter({ hasText: /Boxes/i }).first().click();
    
    // Click "Create New Box"
    const createButton = page.getByRole('button', { name: /Create New Box/i });
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Modal should appear
    await expect(page.getByText('New Sandbox Box')).toBeVisible();
  });
});
