import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/integration-user.json";

/**
 * Integration test setup - authenticates with real credentials.
 *
 * Unlike the regular auth setup, this:
 * - REQUIRES real credentials (fails if not provided)
 * - Verifies the user has sufficient credits
 * - Saves to a separate auth file for integration tests
 */
setup("authenticate for integration tests", async ({ page }) => {
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("BROWSER ERROR:", err.message));

  // Integration tests REQUIRE real credentials
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(`
================================================================================
INTEGRATION TEST SETUP FAILED

E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables are required.

Integration tests use real production services and cannot use mock authentication.

To run integration tests:

  export E2E_TEST_EMAIL="your-email@example.com"
  export E2E_TEST_PASSWORD="your-password"
  export E2E_INTEGRATION_MODE="true"
  npm run test:e2e:integration

================================================================================
    `);
  }

  console.log("🔐 Authenticating with real credentials for integration tests...");
  console.log(`   Email: ${email}`);

  await page.goto("/");

  // If we're on the landing page, click "Sign In"
  const landingHeading = page.getByText(/Your Agents/i).first();
  if (await landingHeading.isVisible({ timeout: 10000 })) {
    await page
      .getByRole("button", { name: /Sign In|Get Started/i })
      .first()
      .click();
  }

  // Wait for auth page to load
  await expect(
    page.getByRole("button", { name: /Enter the Castle/i }),
  ).toBeVisible({ timeout: 30000 });

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click login button
  await page.click('button:has-text("Enter the Castle")');

  // Wait for redirect to authenticated app
  await page.waitForURL("/");

  // Check for Sidebar content which is always visible after login
  await expect(page.getByText(/Dashboard/i).first()).toBeVisible({
    timeout: 15000,
  });

  console.log("✅ Successfully authenticated");

  // Verify user has sufficient credits for integration tests
  console.log("💰 Verifying account has sufficient credits...");

  // Navigate to billing page to check credits
  await page.goto("/billing");
  await page.waitForLoadState("networkidle");

  // Look for balance indicator
  const balanceElement = page.locator(
    '[data-testid="balance"], [class*="balance"], text=/\\$[0-9]/i'
  );

  if (await balanceElement.isVisible({ timeout: 10000 })) {
    const balanceText = await balanceElement.textContent();
    console.log(`   Current balance: ${balanceText}`);

    // Check if balance is positive (basic check)
    if (balanceText && balanceText.includes("$0.00")) {
      console.warn("⚠️  Warning: Account balance appears to be $0.00");
      console.warn("   Integration tests may fail due to insufficient credits");
    }
  } else {
    console.log("   Could not verify balance (element not found)");
  }

  // Navigate back to dashboard
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Save authentication state
  await page.context().storageState({ path: authFile });

  console.log("💾 Authentication state saved for integration tests");
  console.log(`   File: ${authFile}`);
});
