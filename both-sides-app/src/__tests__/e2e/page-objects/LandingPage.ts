/**
 * Landing Page Object Model
 * Handles the main landing page and initial user interactions
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LandingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page elements
  get heroTitle(): Locator {
    return this.page.locator('[data-testid="hero-title"]');
  }

  get heroSubtitle(): Locator {
    return this.page.locator('[data-testid="hero-subtitle"]');
  }

  get getStartedButton(): Locator {
    return this.page.locator('[data-testid="get-started-button"]');
  }

  get signInButton(): Locator {
    return this.page.locator('[data-testid="sign-in-button"]');
  }

  get learnMoreButton(): Locator {
    return this.page.locator('[data-testid="learn-more-button"]');
  }

  get featuresSection(): Locator {
    return this.page.locator('[data-testid="features-section"]');
  }

  get testimonialSection(): Locator {
    return this.page.locator('[data-testid="testimonial-section"]');
  }

  get footerLinks(): Locator {
    return this.page.locator('[data-testid="footer-links"]');
  }

  get demoVideoButton(): Locator {
    return this.page.locator('[data-testid="demo-video-button"]');
  }

  get pricingSection(): Locator {
    return this.page.locator('[data-testid="pricing-section"]');
  }

  // Navigation methods
  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async clickGetStarted(): Promise<void> {
    await this.clickAndWait(this.getStartedButton);
  }

  async clickSignIn(): Promise<void> {
    await this.clickAndWait(this.signInButton);
  }

  async clickLearnMore(): Promise<void> {
    await this.scrollToElement(this.learnMoreButton);
    await this.clickAndWait(this.learnMoreButton, false);
  }

  async playDemoVideo(): Promise<void> {
    await this.scrollToElement(this.demoVideoButton);
    await this.demoVideoButton.click();
    
    // Wait for video modal to appear
    const videoModal = this.page.locator('[data-testid="video-modal"]');
    await this.expectElementVisible(videoModal);
  }

  async scrollToFeatures(): Promise<void> {
    await this.scrollToElement(this.featuresSection);
  }

  async scrollToTestimonials(): Promise<void> {
    await this.scrollToElement(this.testimonialSection);
  }

  async scrollToPricing(): Promise<void> {
    await this.scrollToElement(this.pricingSection);
  }

  // Validation methods
  async validateHeroSection(): Promise<void> {
    await this.expectElementVisible(this.heroTitle);
    await this.expectElementVisible(this.heroSubtitle);
    await this.expectElementVisible(this.getStartedButton);
    await this.expectElementVisible(this.signInButton);
    
    await this.expectText(this.heroTitle, /Both Sides/i);
    await this.expectText(this.heroSubtitle, /AI-powered debate/i);
  }

  async validateFeaturesSection(): Promise<void> {
    await this.scrollToFeatures();
    await this.expectElementVisible(this.featuresSection);
    
    const featureCards = this.page.locator('[data-testid="feature-card"]');
    const count = await featureCards.count();
    expect(count).toBeGreaterThan(2);
    
    // Validate each feature card has title and description
    for (let i = 0; i < count; i++) {
      const card = featureCards.nth(i);
      const title = card.locator('[data-testid="feature-title"]');
      const description = card.locator('[data-testid="feature-description"]');
      
      await this.expectElementVisible(title);
      await this.expectElementVisible(description);
    }
  }

  async validateTestimonialSection(): Promise<void> {
    await this.scrollToTestimonials();
    await this.expectElementVisible(this.testimonialSection);
    
    const testimonials = this.page.locator('[data-testid="testimonial"]');
    const count = await testimonials.count();
    expect(count).toBeGreaterThan(0);
    
    // Validate testimonial structure
    const firstTestimonial = testimonials.first();
    await this.expectElementVisible(firstTestimonial.locator('[data-testid="testimonial-quote"]'));
    await this.expectElementVisible(firstTestimonial.locator('[data-testid="testimonial-author"]'));
  }

  async validatePricingSection(): Promise<void> {
    await this.scrollToPricing();
    await this.expectElementVisible(this.pricingSection);
    
    const pricingCards = this.page.locator('[data-testid="pricing-card"]');
    const count = await pricingCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Validate pricing card structure
    for (let i = 0; i < count; i++) {
      const card = pricingCards.nth(i);
      await this.expectElementVisible(card.locator('[data-testid="pricing-title"]'));
      await this.expectElementVisible(card.locator('[data-testid="pricing-price"]'));
      await this.expectElementVisible(card.locator('[data-testid="pricing-features"]'));
    }
  }

  async validateFooter(): Promise<void> {
    await this.scrollToElement(this.footerLinks);
    await this.expectElementVisible(this.footerLinks);
    
    const links = this.footerLinks.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(3);
    
    // Check for essential footer links
    const privacyLink = links.filter({ hasText: /privacy/i });
    const termsLink = links.filter({ hasText: /terms/i });
    const contactLink = links.filter({ hasText: /contact/i });
    
    await this.expectElementVisible(privacyLink);
    await this.expectElementVisible(termsLink);
    await this.expectElementVisible(contactLink);
  }

  // Interactive tests
  async testResponsiveDesign(): Promise<void> {
    // Test desktop view
    await this.page.setViewportSize({ width: 1200, height: 800 });
    await this.validateHeroSection();
    
    // Test tablet view
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.validateHeroSection();
    
    // Test mobile view
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.validateHeroSection();
    
    // Mobile menu should be visible
    const mobileMenuToggle = this.page.locator('[data-testid="mobile-menu-toggle"]');
    await this.expectElementVisible(mobileMenuToggle);
  }

  async testNavigationFlow(): Promise<void> {
    await this.validateHeroSection();
    await this.validateFeaturesSection();
    await this.validateTestimonialSection();
    await this.validatePricingSection();
    await this.validateFooter();
  }

  async testCallToActionButtons(): Promise<void> {
    // Test Get Started button
    const getStartedHref = await this.getStartedButton.getAttribute('href');
    expect(getStartedHref).toContain('/sign-up');
    
    // Test Sign In button
    const signInHref = await this.signInButton.getAttribute('href');
    expect(signInHref).toContain('/sign-in');
  }

  async testPerformance(): Promise<void> {
    const loadTime = await this.measurePageLoadTime();
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Check for performance metrics
    const performanceEntries = await this.page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });
    
    const entries = JSON.parse(performanceEntries);
    expect(entries.length).toBeGreaterThan(0);
  }
}
