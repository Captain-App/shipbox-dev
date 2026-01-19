import { test, expect } from "@playwright/test";

/**
 * Direct test for the opencode_deploy_pages tool.
 * Uses an existing sandbox to test deployment.
 */
test.describe("Deploy Pages Tool", () => {
  test.use({ storageState: "playwright/.auth/integration-user.json" });

  test("can deploy a static site to Cloudflare Pages", async ({ page }) => {
    // 1. Navigate to boxes page
    await page.goto("/boxes");
    await page.waitForLoadState("networkidle");

    // Wait for boxes to load
    await page.waitForTimeout(3000);

    // 2. Find and open the first available active box, or the "Deploy Pages Test" one
    const openButton = page.getByRole("button", { name: /open/i }).first();
    await expect(openButton).toBeVisible({ timeout: 30000 });
    await openButton.click();

    // Wait for chat input to appear (indicates sandbox is ready)
    const chatInput = page.getByPlaceholder(/ask your agent/i).first();
    await expect(chatInput).toBeVisible({ timeout: 120000 });

    // 3. Send the deploy pages task
    const timestamp = Date.now();
    const task = `Create a folder called "dist" with an index.html file containing: "<html><body><h1>Hello from Cloudflare Pages!</h1><p>Test ID: ${timestamp}</p></body></html>". Then use the opencode_deploy_pages tool to deploy the dist folder with projectName "e2e-test-${timestamp}"`;

    await chatInput.fill(task);
    await chatInput.press("Enter");

    // 4. Wait for task completion (look for pages.dev URL in the response)
    const pagesUrl = page.getByText(/\.pages\.dev/i).first();
    await expect(pagesUrl).toBeVisible({ timeout: 300000 }); // 5 min timeout for agent

    // 5. Extract and verify the URL
    const urlText = await pagesUrl.textContent();
    const urlMatch = urlText?.match(/https:\/\/[^\s"'<>]+\.pages\.dev[^\s"'<>]*/);

    expect(urlMatch).toBeTruthy();

    if (urlMatch) {
      const deployedUrl = urlMatch[0].replace(/[)\].,;:]+$/, ""); // Clean trailing punctuation
      console.log(`Deployed to: ${deployedUrl}`);

      // Wait a bit for deployment to propagate
      await page.waitForTimeout(5000);

      // Fetch the deployed page
      const response = await page.request.get(deployedUrl);
      expect(response.ok()).toBeTruthy();

      const body = await response.text();
      expect(body).toContain("Hello from Cloudflare Pages!");
      expect(body).toContain(`Test ID: ${timestamp}`);

      console.log("Deploy pages test PASSED!");
    }
  });
});
