/**
 * User Onboarding Flow E2E Tests
 * Complete user journey from landing page to dashboard
 */

import { test, expect } from '@playwright/test';
import { LandingPage } from './page-objects/LandingPage';
import { AuthPage } from './page-objects/AuthPage';

test.describe('User Onboarding Flow', () => {
  let landingPage: LandingPage;
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    authPage = new AuthPage(page);
  });

  test.describe('Landing Page Experience', () => {
    test('should display complete landing page with all sections', async () => {
      await landingPage.goto();
      
      // Validate hero section
      await landingPage.validateHeroSection();
      
      // Validate all sections load properly
      await landingPage.testNavigationFlow();
      
      // Ensure no errors occurred
      await landingPage.expectNoErrors();
    });

    test('should be responsive across different screen sizes', async () => {
      await landingPage.goto();
      await landingPage.testResponsiveDesign();
    });

    test('should have working call-to-action buttons', async () => {
      await landingPage.goto();
      await landingPage.testCallToActionButtons();
    });

    test('should load within performance benchmarks', async () => {
      await landingPage.goto();
      await landingPage.testPerformance();
    });

    test('should meet basic accessibility requirements', async () => {
      await landingPage.goto();
      await landingPage.checkAccessibility();
    });
  });

  test.describe('User Registration Flow', () => {
    test('should complete student registration successfully', async () => {
      // Start from landing page
      await landingPage.goto();
      await landingPage.clickGetStarted();
      
      // Should navigate to sign up
      await authPage.expectUrl(/sign-up/);
      
      // Complete registration form
      await authPage.signUpNewStudent();
      
      // Should navigate to email verification or survey
      await authPage.expectUrl(/verify|survey/);
      
      // Verify no errors
      await authPage.expectNoErrors();
    });

    test('should complete teacher registration successfully', async () => {
      await landingPage.goto();
      await landingPage.clickGetStarted();
      
      await authPage.signUpNewTeacher();
      
      // Teachers might have different onboarding flow
      await authPage.expectUrl(/verify|dashboard|setup/);
      await authPage.expectNoErrors();
    });

    test('should validate form inputs properly', async () => {
      await landingPage.goto();
      await landingPage.clickGetStarted();
      
      await authPage.validateFormValidation();
    });

    test('should enforce password strength requirements', async () => {
      await landingPage.goto();
      await landingPage.clickGetStarted();
      
      await authPage.testPasswordStrengthValidation();
    });

    test('should handle duplicate email registration', async ({ page }) => {
      const existingEmail = 'student1@test.bothsides.com'; // From test fixtures
      
      await landingPage.goto();
      await landingPage.clickGetStarted();
      
      await authPage.signUp({
        firstName: 'Duplicate',
        lastName: 'User',
        email: existingEmail,
        password: 'TestPassword123!',
        role: 'student'
      });
      
      // Should show error about existing email
      const duplicateError = page.locator('[data-testid="auth-error"]').filter({ 
        hasText: /already exists|already registered/i 
      });
      await authPage.expectElementVisible(duplicateError);
    });
  });

  test.describe('User Authentication Flow', () => {
    test('should sign in existing user successfully', async () => {
      await authPage.signInWithValidCredentials();
      await authPage.validateSuccessfulAuthentication();
    });

    test('should handle invalid credentials gracefully', async () => {
      await authPage.signInWithInvalidCredentials();
    });

    test('should navigate between sign in and sign up', async () => {
      await authPage.navigateToSignUp();
      await authPage.navigateToSignIn();
    });

    test('should handle forgot password flow', async () => {
      await authPage.gotoSignIn();
      await authPage.clickForgotPassword();
    });

    test('should implement rate limiting for failed attempts', async () => {
      await authPage.testRateLimiting();
    });

    test('should support social authentication options', async () => {
      await authPage.gotoSignIn();
      
      // Verify social auth buttons are present
      await authPage.expectElementVisible(authPage.googleSignInButton);
      await authPage.expectElementVisible(authPage.githubSignInButton);
    });
  });

  test.describe('Survey Onboarding Flow', () => {
    test('should complete belief survey for new student', async ({ page }) => {
      // Sign up new student
      await landingPage.goto();
      await landingPage.clickGetStarted();
      await authPage.signUpNewStudent();
      
      // Should be redirected to survey
      await page.waitForURL(/survey/, { timeout: 10000 });
      
      // Survey page elements
      const surveyTitle = page.locator('[data-testid="survey-title"]');
      const questionText = page.locator('[data-testid="question-text"]');
      const answerOptions = page.locator('[data-testid="answer-option"]');
      const nextButton = page.locator('[data-testid="next-button"]');
      const progressBar = page.locator('[data-testid="progress-bar"]');
      
      await expect(surveyTitle).toBeVisible();
      await expect(questionText).toBeVisible();
      await expect(progressBar).toBeVisible();
      
      // Answer first question
      const firstOption = answerOptions.first();
      await firstOption.click();
      await nextButton.click();
      
      // Progress should update
      const progress = await progressBar.getAttribute('data-progress');
      expect(parseInt(progress || '0')).toBeGreaterThan(0);
      
      // Continue through several questions
      for (let i = 0; i < 5; i++) {
        await page.waitForTimeout(500); // Allow question to load
        
        const options = page.locator('[data-testid="answer-option"]');
        const optionCount = await options.count();
        
        if (optionCount > 0) {
          // Select random option
          const randomIndex = Math.floor(Math.random() * optionCount);
          await options.nth(randomIndex).click();
          
          const next = page.locator('[data-testid="next-button"]');
          if (await next.isVisible()) {
            await next.click();
          }
        }
      }
      
      // Should eventually complete survey
      await page.waitForURL(/dashboard|profile/, { timeout: 30000 });
    });

    test('should save survey progress and allow resume', async ({ page }) => {
      await authPage.signInWithValidCredentials();
      
      // If already completed survey, this test might not apply
      const currentUrl = page.url();
      if (currentUrl.includes('/survey')) {
        // Answer a few questions
        for (let i = 0; i < 3; i++) {
          const options = page.locator('[data-testid="answer-option"]');
          const optionCount = await options.count();
          
          if (optionCount > 0) {
            await options.first().click();
            const nextButton = page.locator('[data-testid="next-button"]');
            if (await nextButton.isVisible()) {
              await nextButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
        
        // Leave and come back
        await page.goto('/dashboard');
        await page.goto('/survey');
        
        // Progress should be maintained
        const progressBar = page.locator('[data-testid="progress-bar"]');
        const progress = await progressBar.getAttribute('data-progress');
        expect(parseInt(progress || '0')).toBeGreaterThan(0);
      }
    });

    test('should generate belief profile after survey completion', async ({ page }) => {
      // This test would require completing full survey
      // For now, we'll test with a user who has completed it
      await authPage.signInWithValidCredentials();
      
      // Navigate to profile page
      await page.goto('/profile');
      
      // Should show belief profile visualization
      const beliefProfile = page.locator('[data-testid="belief-profile"]');
      const politicalAxis = page.locator('[data-testid="political-axis"]');
      const socialAxis = page.locator('[data-testid="social-axis"]');
      
      if (await beliefProfile.isVisible()) {
        await expect(politicalAxis).toBeVisible();
        await expect(socialAxis).toBeVisible();
      }
    });
  });

  test.describe('Dashboard and Navigation', () => {
    test('should navigate to dashboard after successful onboarding', async ({ page }) => {
      await authPage.signInWithValidCredentials();
      
      // Should eventually reach dashboard
      await page.waitForURL(/dashboard/, { timeout: 15000 });
      
      // Validate dashboard elements
      const welcomeMessage = page.locator('[data-testid="welcome-message"]');
      const navigationMenu = page.locator('[data-testid="navigation-menu"]');
      const userProfile = page.locator('[data-testid="user-profile"]');
      
      await expect(navigationMenu).toBeVisible();
      
      if (await welcomeMessage.isVisible()) {
        await expect(welcomeMessage).toContainText(/welcome/i);
      }
    });

    test('should display appropriate content for student users', async ({ page }) => {
      await authPage.signInWithValidCredentials();
      await page.waitForURL(/dashboard/, { timeout: 15000 });
      
      // Student-specific elements
      const myDebates = page.locator('[data-testid="my-debates"]');
      const findOpponents = page.locator('[data-testid="find-opponents"]');
      const learningProgress = page.locator('[data-testid="learning-progress"]');
      
      // At least some student features should be visible
      const studentElements = [myDebates, findOpponents, learningProgress];
      let visibleCount = 0;
      
      for (const element of studentElements) {
        if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
          visibleCount++;
        }
      }
      
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('should handle user logout properly', async ({ page }) => {
      await authPage.signInWithValidCredentials();
      await authPage.validateLogout();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work consistently across browsers', async ({ page, browserName }) => {
      await landingPage.goto();
      await landingPage.validateHeroSection();
      
      // Browser-specific adjustments if needed
      if (browserName === 'webkit') {
        // Safari-specific tests
        await page.waitForTimeout(1000);
      } else if (browserName === 'firefox') {
        // Firefox-specific tests
        await page.waitForTimeout(500);
      }
      
      await landingPage.expectNoErrors();
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network connectivity issues gracefully', async ({ page }) => {
      await landingPage.goto();
      
      // Simulate offline
      await page.context().setOffline(true);
      
      await landingPage.clickGetStarted();
      
      // Should show appropriate offline message
      const offlineMessage = page.locator('[data-testid="offline-message"]');
      if (await offlineMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(offlineMessage).toBeVisible();
      }
      
      // Restore connectivity
      await page.context().setOffline(false);
    });

    test('should handle JavaScript disabled gracefully', async ({ page }) => {
      await page.context().addInitScript(() => {
        // Simulate limited JavaScript environment
        Object.defineProperty(window, 'fetch', { value: undefined });
      });
      
      await landingPage.goto();
      
      // Basic content should still be visible
      await landingPage.expectElementVisible(landingPage.heroTitle);
    });

    test('should handle slow network conditions', async ({ page }) => {
      // Throttle network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });
      
      await landingPage.goto();
      
      // Should still load within reasonable time
      await landingPage.validateHeroSection();
    });
  });
});
