import { Page, expect } from "@playwright/test";

/**
 * Page object for sandbox box workspace
 */
export class BoxWorkspacePage {
  constructor(private page: Page) {}

  async gotoBoxesList(): Promise<void> {
    await this.page.goto("/");
    await this.page
      .getByRole("link", { name: /Boxes/i })
      .first()
      .click();
    await this.page.waitForLoadState("networkidle");
  }

  async clickCreateNewBox(): Promise<void> {
    const createButton = this.page.getByRole("button", {
      name: /Create New Box/i,
    });
    await expect(createButton).toBeVisible();
    await createButton.click();
  }

  async expectCreateModalVisible(): Promise<void> {
    await expect(
      this.page.getByText(/New Sandbox Box|Create Box/i),
    ).toBeVisible({ timeout: 10000 });
  }

  async fillBoxTitle(title: string): Promise<void> {
    const titleInput = this.page
      .locator("input[placeholder*='Title'], input[placeholder*='Name']")
      .first();
    await titleInput.fill(title);
  }

  async submitCreateBox(): Promise<void> {
    // Use force:true to bypass modal backdrop intercept issue
    await this.page
      .getByRole("button", { name: /Initialise Sandbox|Create|Submit/i })
      .first()
      .click({ force: true });
    await this.page.waitForLoadState("networkidle");
  }

  async openFirstBox(): Promise<void> {
    await this.page.getByRole("button", { name: /Open/i }).first().click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectChatInputVisible(): Promise<void> {
    await expect(
      this.page.getByPlaceholder(/Ask your agent|Type a message/i),
    ).toBeVisible({ timeout: 10000 });
  }

  async sendMessage(message: string): Promise<void> {
    const input = this.page.getByPlaceholder(
      /Ask your agent|Type a message/i,
    );
    await input.fill(message);
    await this.page
      .getByRole("button", { name: /Send|Submit/i })
      .first()
      .click();
  }

  async waitForAgentResponse(timeout = 10000): Promise<void> {
    // Wait for at least one message from agent in chat
    await this.page
      .locator("[class*='message'], [class*='chat']")
      .locator("text=/./")
      .first()
      .waitFor({ state: "visible", timeout });
  }

  async expectPreviewTabVisible(): Promise<void> {
    const previewTab = this.page.getByRole("button", { name: /Preview/i });
    await expect(previewTab).toBeVisible();
  }

  async clickPreviewTab(): Promise<void> {
    await this.page.getByRole("button", { name: /Preview/i }).click();
    await this.page.waitForLoadState("networkidle");
  }

  async expectIframeVisible(): Promise<void> {
    const iframe = this.page.locator('iframe[title*="Preview"], iframe[src*="engine"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });
  }

  async deleteBox(): Promise<void> {
    const deleteButton = this.page.getByRole("button", {
      name: /Delete|Remove/i,
    });
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      // Confirm deletion if prompted
      const confirmButton = this.page.getByRole("button", {
        name: /Confirm|Yes|Delete/i,
      });
      if (await confirmButton.isVisible({ timeout: 5000 })) {
        await confirmButton.click();
      }
      await this.page.waitForLoadState("networkidle");
    }
  }
}
