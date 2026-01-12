import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'docs-site/public/screenshots';

// Ensure screenshot directory exists
mkdirSync(SCREENSHOT_DIR, { recursive: true });

test.describe('Generate Screenshots', () => {
  // All tests in this block use the authenticated state from auth.setup.ts
  
  test('capture auth page', async ({ browser }) => {
    // Create a new context without the stored auth state to see the login page
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    
    await page.goto('/');
    await expect(page.getByText(/Shipbox/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Enter the Castle/i })).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/auth.png` });
    await context.close();
  });

  test('capture dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Dashboard/i).first()).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dashboard.png` });
  });

  test('capture settings', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: /Settings/i }).first().click();
    // Wait for the Settings page content
    await expect(page.getByText(/Manage your credentials/i)).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/settings.png` });
  });

  test('capture billing', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: /Billing/i }).first().click();
    await expect(page.getByText('Balance', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/billing.png` });
  });

  test('capture boxes list', async ({ page }) => {
    await page.goto('/');
    await page.locator('button').filter({ hasText: /Boxes/i }).first().click();
    // Check for Boxes heading
    await expect(page.getByRole('heading', { name: /Boxes/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/boxes.png` });
  });

  test('capture create sandbox modal', async ({ page }) => {
    await page.goto('/');
    // Go to Boxes page
    await page.locator('button').filter({ hasText: /Boxes/i }).first().click();
    // Click the "Create New Box" button
    await page.getByRole('button', { name: /Create New Box/i }).click();
    
    // Modal should appear with "New Sandbox Box" heading
    await expect(page.getByText('New Sandbox Box')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/create-sandbox.png` });
  });

  test('capture workspace view', async ({ page }) => {
    await page.goto('/');
    // Workspace view might only be available if there is an active sandbox.
    // Since we can't guarantee that in E2E without real data, we check if "Open Box" is visible.
    const openBtn = page.locator('button').filter({ hasText: /Open Box/i }).first();
    if (await openBtn.isVisible()) {
      await openBtn.click();
      await expect(page.getByText(/Back to Dashboard/i).or(page.getByText(/Box Details/i))).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/workspace.png` });
    } else {
      console.log('Skipping workspace screenshot - no active box found');
    }
  });
});
