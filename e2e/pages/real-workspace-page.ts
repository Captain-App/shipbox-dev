import { Page, expect } from "@playwright/test";

/**
 * Page object for integration tests with real Cloudflare sandboxes.
 * Handles waiting for sandbox containers, sending tasks, and observing realtime events.
 */
export class RealWorkspacePage {
  constructor(private page: Page) {}

  /**
   * Wait for sandbox to become active (container started).
   * This can take 60-90 seconds for real sandboxes.
   */
  async waitForSandboxReady(timeout = 120000): Promise<void> {
    console.log("Waiting for sandbox to become active...");

    // Look for status indicators in the UI
    // The sandbox is ready when status shows "active" or the workspace is interactive
    await expect(async () => {
      // Check for active status badge or ready indicator
      const activeStatus = this.page.locator(
        '[data-testid="sandbox-status"], [class*="status"]'
      );
      const statusText = await activeStatus.textContent();

      // Also check if the chat input is available (indicates workspace is ready)
      const chatInput = this.page.getByPlaceholder(
        /Ask your agent|Type a message/i
      );
      const isInputVisible = await chatInput.isVisible();

      if (statusText?.toLowerCase().includes("active") || isInputVisible) {
        return true;
      }
      throw new Error(`Sandbox not ready yet. Status: ${statusText}`);
    }).toPass({
      timeout,
      intervals: [2000, 5000, 10000], // Poll at increasing intervals
    });

    console.log("Sandbox is active and ready!");
  }

  /**
   * Send a task to the OpenCode agent and return the run ID.
   */
  async sendTask(task: string): Promise<string | undefined> {
    const chatInput = this.page.getByPlaceholder(
      /Ask your agent|Type a message/i
    );
    await expect(chatInput).toBeVisible({ timeout: 30000 });

    await chatInput.fill(task);

    // Click send button
    const sendButton = this.page
      .getByRole("button", { name: /Send|Submit/i })
      .first();
    await sendButton.click();

    // Wait for the message to be sent
    await this.page.waitForTimeout(1000);

    // Try to capture run ID from network request or UI
    // The run ID may be displayed in the UI or captured from the API response
    const runIdElement = this.page.locator('[data-run-id], [data-testid="run-id"]');
    if (await runIdElement.isVisible({ timeout: 5000 })) {
      return await runIdElement.getAttribute("data-run-id") || undefined;
    }

    return undefined;
  }

  /**
   * Wait for a specific realtime event type.
   * Events include: tool_call, tool_result, message, plan_update, etc.
   */
  async waitForRealtimeEvent(
    eventType: string,
    timeout = 60000
  ): Promise<boolean> {
    console.log(`Waiting for realtime event: ${eventType}`);

    // Look for event indicators in the UI
    // This depends on how the app displays realtime events
    try {
      await expect(async () => {
        // Look for tool call indicators
        if (eventType === "tool_call") {
          const toolCallIndicator = this.page.locator(
            '[class*="tool"], [data-testid="tool-call"], text=/Running|Executing/i'
          );
          if (await toolCallIndicator.isVisible({ timeout: 1000 })) {
            return true;
          }
        }

        // Look for message events
        if (eventType === "message") {
          const messageIndicator = this.page.locator(
            '[class*="message"], [data-testid="agent-message"]'
          );
          const count = await messageIndicator.count();
          if (count > 0) {
            return true;
          }
        }

        // Look for plan updates
        if (eventType === "plan_update") {
          const planIndicator = this.page.locator(
            '[class*="plan"], [data-testid="plan-content"], text=/PLAN|Planning/i'
          );
          if (await planIndicator.isVisible({ timeout: 1000 })) {
            return true;
          }
        }

        throw new Error(`Event ${eventType} not detected yet`);
      }).toPass({ timeout, intervals: [1000, 2000, 5000] });

      console.log(`Detected realtime event: ${eventType}`);
      return true;
    } catch {
      console.log(`Timeout waiting for event: ${eventType}`);
      return false;
    }
  }

  /**
   * Wait for the current task to complete.
   * Task is complete when the agent stops responding and status is idle.
   */
  async waitForTaskCompletion(timeout = 180000): Promise<void> {
    console.log("Waiting for task to complete...");

    // Wait for agent to finish processing
    await expect(async () => {
      // Check for completion indicators
      const loadingIndicator = this.page.locator(
        '[class*="loading"], [class*="spinner"], [data-testid="agent-thinking"]'
      );
      const isLoading = await loadingIndicator.isVisible({ timeout: 500 });

      // Check for idle/ready state
      const idleIndicator = this.page.locator(
        '[data-testid="agent-idle"], text=/Ready|Done|Completed/i'
      );
      const isIdle = await idleIndicator.isVisible({ timeout: 500 });

      // Also check if chat input is re-enabled (indicates task complete)
      const chatInput = this.page.getByPlaceholder(
        /Ask your agent|Type a message/i
      );
      const isInputEnabled = await chatInput.isEnabled();

      if (!isLoading && (isIdle || isInputEnabled)) {
        return true;
      }
      throw new Error("Task still in progress");
    }).toPass({
      timeout,
      intervals: [2000, 5000, 10000],
    });

    console.log("Task completed!");
  }

  /**
   * Check if a file exists in the workspace.
   */
  async verifyFileExists(
    filePath: string,
    timeout = 30000
  ): Promise<boolean> {
    console.log(`Checking for file: ${filePath}`);

    // Look for file in the file tree or workspace explorer
    try {
      const fileElement = this.page.locator(
        `[data-testid="file-${filePath.replace(/\//g, "-")}"], text="${filePath}"`
      );
      await expect(fileElement).toBeVisible({ timeout });
      console.log(`File found: ${filePath}`);
      return true;
    } catch {
      console.log(`File not found: ${filePath}`);
      return false;
    }
  }

  /**
   * Get the content of PLAN.md or similar planning file.
   */
  async getPlanContent(): Promise<string | null> {
    // Look for plan panel or PLAN.md content in the UI
    const planElement = this.page.locator(
      '[data-testid="plan-content"], [class*="plan"], [class*="markdown"]'
    );

    if (await planElement.isVisible({ timeout: 5000 })) {
      return await planElement.textContent();
    }

    return null;
  }

  /**
   * Verify that the plan contains expected text.
   */
  async verifyPlanContains(expectedText: string): Promise<boolean> {
    const planContent = await this.getPlanContent();
    if (!planContent) {
      console.log("No plan content found");
      return false;
    }

    const contains = planContent.includes(expectedText);
    console.log(
      `Plan ${contains ? "contains" : "does not contain"}: "${expectedText}"`
    );
    return contains;
  }

  /**
   * Delete the current test box (cleanup after test).
   */
  async deleteCurrentBox(): Promise<void> {
    console.log("Deleting test box...");

    // Look for delete/settings menu
    const settingsButton = this.page.getByRole("button", {
      name: /Settings|Menu|Options/i,
    });
    if (await settingsButton.isVisible({ timeout: 5000 })) {
      await settingsButton.click();
    }

    // Click delete option
    const deleteButton = this.page.getByRole("button", {
      name: /Delete|Remove/i,
    });
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = this.page.getByRole("button", {
        name: /Confirm|Yes|Delete/i,
      });
      if (await confirmButton.isVisible({ timeout: 5000 })) {
        await confirmButton.click();
      }

      await this.page.waitForLoadState("networkidle");
      console.log("Test box deleted");
    }
  }

  /**
   * Get the current sandbox status from the UI.
   */
  async getSandboxStatus(): Promise<string | null> {
    const statusElement = this.page.locator(
      '[data-testid="sandbox-status"], [class*="status"]'
    );
    if (await statusElement.isVisible({ timeout: 5000 })) {
      return await statusElement.textContent();
    }
    return null;
  }
}
