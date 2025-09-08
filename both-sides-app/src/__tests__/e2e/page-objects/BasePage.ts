/**
 * Base Page Object Model
 * Common functionality shared across all page objects
 */

import { Page, Locator, expect } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common elements
  get loadingSpinner(): Locator {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  get errorMessage(): Locator {
    return this.page.locator('[data-testid="error-message"]');
  }

  get successMessage(): Locator {
    return this.page.locator('[data-testid="success-message"]');
  }

  get navigationMenu(): Locator {
    return this.page.locator('[data-testid="navigation-menu"]');
  }

  get userAvatar(): Locator {
    return this.page.locator('[data-testid="user-avatar"]');
  }

  // Common actions
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 10000 });
  }

  async waitForApiCall(urlPattern: string | RegExp): Promise<void> {
    await this.page.waitForResponse(response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    });
  }

  async clickAndWait(locator: Locator, waitForNavigation = true): Promise<void> {
    if (waitForNavigation) {
      await Promise.all([
        this.page.waitForLoadState('networkidle'),
        locator.click()
      ]);
    } else {
      await locator.click();
    }
  }

  async fillAndValidate(locator: Locator, value: string): Promise<void> {
    await locator.fill(value);
    await expect(locator).toHaveValue(value);
  }

  async selectDropdownOption(dropdown: Locator, option: string): Promise<void> {
    await dropdown.click();
    await this.page.locator(`[role="option"][data-value="${option}"]`).click();
  }

  async uploadFile(fileInput: Locator, filePath: string): Promise<void> {
    await fileInput.setInputFiles(filePath);
  }

  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  // Assertion helpers
  async expectElementVisible(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).toBeVisible({ timeout });
  }

  async expectElementHidden(locator: Locator, timeout = 5000): Promise<void> {
    await expect(locator).not.toBeVisible({ timeout });
  }

  async expectText(locator: Locator, text: string | RegExp): Promise<void> {
    await expect(locator).toHaveText(text);
  }

  async expectUrl(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url);
  }

  async expectPageTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title);
  }

  // Error handling
  async expectNoErrors(): Promise<void> {
    await expect(this.errorMessage).not.toBeVisible();
    
    // Check for console errors
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    if (errors.length > 0) {
      throw new Error(`Console errors found: ${errors.join(', ')}`);
    }
  }

  // Authentication helpers
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.userAvatar.waitFor({ state: 'visible', timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (await this.isLoggedIn()) {
      await this.userAvatar.click();
      await this.page.locator('[data-testid="logout-button"]').click();
      await this.waitForPageLoad();
    }
  }

  // Mobile helpers
  async isMobile(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  async openMobileMenu(): Promise<void> {
    if (await this.isMobile()) {
      await this.page.locator('[data-testid="mobile-menu-toggle"]').click();
    }
  }

  // Accessibility helpers
  async checkAccessibility(): Promise<void> {
    // Basic accessibility checks
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    expect(headings).toBeGreaterThan(0);

    const images = await this.page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    const buttons = await this.page.locator('button, [role="button"]').all();
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text || ariaLabel).toBeTruthy();
    }
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.waitForPageLoad();
    return Date.now() - startTime;
  }

  // Debug helpers
  async debugPause(): Promise<void> {
    if (process.env.DEBUG === 'true') {
      await this.page.pause();
    }
  }

  async logPageInfo(): Promise<void> {
    console.log(`Current URL: ${this.page.url()}`);
    console.log(`Page title: ${await this.page.title()}`);
    console.log(`Viewport: ${JSON.stringify(this.page.viewportSize())}`);
  }
}
