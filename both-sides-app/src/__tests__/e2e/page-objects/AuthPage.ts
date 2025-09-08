/**
 * Authentication Page Object Model
 * Handles sign-in, sign-up, and authentication flows
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Sign In elements
  get signInForm(): Locator {
    return this.page.locator('[data-testid="sign-in-form"]');
  }

  get emailInput(): Locator {
    return this.page.locator('[data-testid="email-input"]');
  }

  get passwordInput(): Locator {
    return this.page.locator('[data-testid="password-input"]');
  }

  get signInButton(): Locator {
    return this.page.locator('[data-testid="sign-in-submit"]');
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator('[data-testid="forgot-password-link"]');
  }

  get signUpLink(): Locator {
    return this.page.locator('[data-testid="sign-up-link"]');
  }

  // Sign Up elements
  get signUpForm(): Locator {
    return this.page.locator('[data-testid="sign-up-form"]');
  }

  get firstNameInput(): Locator {
    return this.page.locator('[data-testid="first-name-input"]');
  }

  get lastNameInput(): Locator {
    return this.page.locator('[data-testid="last-name-input"]');
  }

  get signUpEmailInput(): Locator {
    return this.page.locator('[data-testid="sign-up-email-input"]');
  }

  get signUpPasswordInput(): Locator {
    return this.page.locator('[data-testid="sign-up-password-input"]');
  }

  get confirmPasswordInput(): Locator {
    return this.page.locator('[data-testid="confirm-password-input"]');
  }

  get roleSelect(): Locator {
    return this.page.locator('[data-testid="role-select"]');
  }

  get termsCheckbox(): Locator {
    return this.page.locator('[data-testid="terms-checkbox"]');
  }

  get signUpButton(): Locator {
    return this.page.locator('[data-testid="sign-up-submit"]');
  }

  get signInLink(): Locator {
    return this.page.locator('[data-testid="sign-in-link"]');
  }

  // Verification elements
  get verificationForm(): Locator {
    return this.page.locator('[data-testid="verification-form"]');
  }

  get verificationCodeInput(): Locator {
    return this.page.locator('[data-testid="verification-code-input"]');
  }

  get verifyButton(): Locator {
    return this.page.locator('[data-testid="verify-button"]');
  }

  get resendCodeButton(): Locator {
    return this.page.locator('[data-testid="resend-code-button"]');
  }

  // Error and success messages
  get authError(): Locator {
    return this.page.locator('[data-testid="auth-error"]');
  }

  get authSuccess(): Locator {
    return this.page.locator('[data-testid="auth-success"]');
  }

  get fieldErrors(): Locator {
    return this.page.locator('[data-testid="field-error"]');
  }

  // Social auth elements
  get googleSignInButton(): Locator {
    return this.page.locator('[data-testid="google-sign-in"]');
  }

  get githubSignInButton(): Locator {
    return this.page.locator('[data-testid="github-sign-in"]');
  }

  // Navigation methods
  async gotoSignIn(): Promise<void> {
    await this.page.goto('/sign-in');
    await this.waitForPageLoad();
  }

  async gotoSignUp(): Promise<void> {
    await this.page.goto('/sign-up');
    await this.waitForPageLoad();
  }

  // Sign In methods
  async signIn(email: string, password: string): Promise<void> {
    await this.gotoSignIn();
    await this.expectElementVisible(this.signInForm);
    
    await this.fillAndValidate(this.emailInput, email);
    await this.fillAndValidate(this.passwordInput, password);
    
    await this.clickAndWait(this.signInButton);
  }

  async signInWithValidCredentials(): Promise<void> {
    const testUser = global.testUsers?.[0] || {
      email: 'student1@test.bothsides.com',
      password: 'TestPassword123!'
    };
    
    await this.signIn(testUser.email, testUser.password || 'TestPassword123!');
  }

  async signInWithInvalidCredentials(): Promise<void> {
    await this.signIn('invalid@example.com', 'wrongpassword');
    await this.expectElementVisible(this.authError);
  }

  async navigateToSignUp(): Promise<void> {
    await this.gotoSignIn();
    await this.clickAndWait(this.signUpLink);
    await this.expectUrl(/sign-up/);
  }

  async clickForgotPassword(): Promise<void> {
    await this.clickAndWait(this.forgotPasswordLink);
    // Should navigate to password reset page
    await this.expectUrl(/reset-password/);
  }

  // Sign Up methods
  async signUp(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: 'student' | 'teacher';
  }): Promise<void> {
    await this.gotoSignUp();
    await this.expectElementVisible(this.signUpForm);
    
    await this.fillAndValidate(this.firstNameInput, userData.firstName);
    await this.fillAndValidate(this.lastNameInput, userData.lastName);
    await this.fillAndValidate(this.signUpEmailInput, userData.email);
    await this.fillAndValidate(this.signUpPasswordInput, userData.password);
    await this.fillAndValidate(this.confirmPasswordInput, userData.password);
    
    await this.selectDropdownOption(this.roleSelect, userData.role);
    await this.termsCheckbox.check();
    
    await this.clickAndWait(this.signUpButton);
  }

  async signUpNewStudent(): Promise<void> {
    const timestamp = Date.now();
    await this.signUp({
      firstName: 'Test',
      lastName: 'Student',
      email: `student${timestamp}@test.bothsides.com`,
      password: 'TestPassword123!',
      role: 'student'
    });
  }

  async signUpNewTeacher(): Promise<void> {
    const timestamp = Date.now();
    await this.signUp({
      firstName: 'Test',
      lastName: 'Teacher',
      email: `teacher${timestamp}@test.bothsides.com`,
      password: 'TestPassword123!',
      role: 'teacher'
    });
  }

  async navigateToSignIn(): Promise<void> {
    await this.gotoSignUp();
    await this.clickAndWait(this.signInLink);
    await this.expectUrl(/sign-in/);
  }

  // Verification methods
  async verifyEmail(code: string): Promise<void> {
    await this.expectElementVisible(this.verificationForm);
    await this.fillAndValidate(this.verificationCodeInput, code);
    await this.clickAndWait(this.verifyButton);
  }

  async resendVerificationCode(): Promise<void> {
    await this.clickAndWait(this.resendCodeButton, false);
    await this.expectElementVisible(this.authSuccess);
  }

  // Social authentication methods
  async signInWithGoogle(): Promise<void> {
    await this.gotoSignIn();
    await this.clickAndWait(this.googleSignInButton);
    
    // Handle Google OAuth popup
    const popup = await this.page.waitForEvent('popup');
    await popup.waitForLoadState();
    
    // In a real test, you'd interact with Google's auth flow
    // For now, we'll mock the success
    await popup.close();
  }

  async signInWithGitHub(): Promise<void> {
    await this.gotoSignIn();
    await this.clickAndWait(this.githubSignInButton);
    
    // Handle GitHub OAuth popup
    const popup = await this.page.waitForEvent('popup');
    await popup.waitForLoadState();
    
    // In a real test, you'd interact with GitHub's auth flow
    await popup.close();
  }

  // Validation methods
  async validateSignInForm(): Promise<void> {
    await this.gotoSignIn();
    await this.expectElementVisible(this.signInForm);
    await this.expectElementVisible(this.emailInput);
    await this.expectElementVisible(this.passwordInput);
    await this.expectElementVisible(this.signInButton);
    await this.expectElementVisible(this.forgotPasswordLink);
    await this.expectElementVisible(this.signUpLink);
  }

  async validateSignUpForm(): Promise<void> {
    await this.gotoSignUp();
    await this.expectElementVisible(this.signUpForm);
    await this.expectElementVisible(this.firstNameInput);
    await this.expectElementVisible(this.lastNameInput);
    await this.expectElementVisible(this.signUpEmailInput);
    await this.expectElementVisible(this.signUpPasswordInput);
    await this.expectElementVisible(this.confirmPasswordInput);
    await this.expectElementVisible(this.roleSelect);
    await this.expectElementVisible(this.termsCheckbox);
    await this.expectElementVisible(this.signUpButton);
  }

  async validateFormValidation(): Promise<void> {
    await this.gotoSignUp();
    
    // Try to submit empty form
    await this.signUpButton.click();
    
    // Should show validation errors
    const errors = await this.fieldErrors.count();
    expect(errors).toBeGreaterThan(0);
    
    // Test email validation
    await this.fillAndValidate(this.signUpEmailInput, 'invalid-email');
    await this.signUpButton.click();
    
    const emailError = this.fieldErrors.filter({ hasText: /email/i });
    await this.expectElementVisible(emailError);
    
    // Test password confirmation
    await this.fillAndValidate(this.signUpPasswordInput, 'password123');
    await this.fillAndValidate(this.confirmPasswordInput, 'different123');
    await this.signUpButton.click();
    
    const passwordError = this.fieldErrors.filter({ hasText: /match/i });
    await this.expectElementVisible(passwordError);
  }

  async validateSuccessfulAuthentication(): Promise<void> {
    await this.signInWithValidCredentials();
    
    // Should redirect to dashboard or onboarding
    await this.expectUrl(/dashboard|survey/);
    
    // User should be logged in
    expect(await this.isLoggedIn()).toBe(true);
  }

  async validateLogout(): Promise<void> {
    // Ensure user is logged in first
    if (!(await this.isLoggedIn())) {
      await this.signInWithValidCredentials();
    }
    
    await this.logout();
    
    // Should redirect to landing page or sign in
    await this.expectUrl(/^(?!.*dashboard).*$/);
    expect(await this.isLoggedIn()).toBe(false);
  }

  // Security tests
  async testPasswordStrengthValidation(): Promise<void> {
    await this.gotoSignUp();
    
    const weakPasswords = [
      '123',
      'password',
      'abc123',
      '12345678'
    ];
    
    for (const password of weakPasswords) {
      await this.fillAndValidate(this.signUpPasswordInput, password);
      await this.signUpButton.click();
      
      const passwordError = this.fieldErrors.filter({ hasText: /password.*weak|password.*strong/i });
      await this.expectElementVisible(passwordError);
      
      await this.signUpPasswordInput.clear();
    }
  }

  async testRateLimiting(): Promise<void> {
    await this.gotoSignIn();
    
    // Attempt multiple failed logins
    for (let i = 0; i < 5; i++) {
      await this.signIn('test@example.com', 'wrongpassword');
      await this.page.waitForTimeout(500);
    }
    
    // Should show rate limiting error
    const rateLimitError = this.authError.filter({ hasText: /too many attempts|rate limit/i });
    await this.expectElementVisible(rateLimitError);
  }
}
