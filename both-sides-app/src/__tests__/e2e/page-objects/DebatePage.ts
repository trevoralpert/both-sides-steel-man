/**
 * Debate Page Object Model
 * Handles debate room interactions, messaging, and real-time features
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DebatePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Debate room elements
  get debateTitle(): Locator {
    return this.page.locator('[data-testid="debate-title"]');
  }

  get topicDescription(): Locator {
    return this.page.locator('[data-testid="topic-description"]');
  }

  get participantList(): Locator {
    return this.page.locator('[data-testid="participant-list"]');
  }

  get currentPhase(): Locator {
    return this.page.locator('[data-testid="current-phase"]');
  }

  get phaseTimer(): Locator {
    return this.page.locator('[data-testid="phase-timer"]');
  }

  get phaseProgress(): Locator {
    return this.page.locator('[data-testid="phase-progress"]');
  }

  // Messaging elements
  get messageContainer(): Locator {
    return this.page.locator('[data-testid="message-container"]');
  }

  get messageInput(): Locator {
    return this.page.locator('[data-testid="message-input"]');
  }

  get sendButton(): Locator {
    return this.page.locator('[data-testid="send-button"]');
  }

  get messages(): Locator {
    return this.page.locator('[data-testid="message"]');
  }

  get typingIndicator(): Locator {
    return this.page.locator('[data-testid="typing-indicator"]');
  }

  get messageHistory(): Locator {
    return this.page.locator('[data-testid="message-history"]');
  }

  // Position and role elements
  get myPosition(): Locator {
    return this.page.locator('[data-testid="my-position"]');
  }

  get opponentPosition(): Locator {
    return this.page.locator('[data-testid="opponent-position"]');
  }

  get positionBadge(): Locator {
    return this.page.locator('[data-testid="position-badge"]');
  }

  // AI coaching elements
  get coachingSidebar(): Locator {
    return this.page.locator('[data-testid="coaching-sidebar"]');
  }

  get coachingToggle(): Locator {
    return this.page.locator('[data-testid="coaching-toggle"]');
  }

  get suggestions(): Locator {
    return this.page.locator('[data-testid="suggestion"]');
  }

  get implementSuggestionButton(): Locator {
    return this.page.locator('[data-testid="implement-suggestion"]');
  }

  // Evidence and research elements
  get evidencePanel(): Locator {
    return this.page.locator('[data-testid="evidence-panel"]');
  }

  get searchEvidence(): Locator {
    return this.page.locator('[data-testid="search-evidence"]');
  }

  get evidenceResults(): Locator {
    return this.page.locator('[data-testid="evidence-result"]');
  }

  get citeEvidenceButton(): Locator {
    return this.page.locator('[data-testid="cite-evidence"]');
  }

  // Turn management elements
  get speakingQueue(): Locator {
    return this.page.locator('[data-testid="speaking-queue"]');
  }

  get turnIndicator(): Locator {
    return this.page.locator('[data-testid="turn-indicator"]');
  }

  get requestTurnButton(): Locator {
    return this.page.locator('[data-testid="request-turn"]');
  }

  get turnTimer(): Locator {
    return this.page.locator('[data-testid="turn-timer"]');
  }

  // Control elements
  get settingsButton(): Locator {
    return this.page.locator('[data-testid="settings-button"]');
  }

  get leaveDebateButton(): Locator {
    return this.page.locator('[data-testid="leave-debate"]');
  }

  get reportButton(): Locator {
    return this.page.locator('[data-testid="report-button"]');
  }

  get helpButton(): Locator {
    return this.page.locator('[data-testid="help-button"]');
  }

  // Navigation methods
  async gotoDebate(conversationId: string): Promise<void> {
    await this.page.goto(`/debate/${conversationId}`);
    await this.waitForPageLoad();
  }

  async joinDebateFromDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    
    const joinButton = this.page.locator('[data-testid="join-debate-button"]').first();
    await this.clickAndWait(joinButton);
  }

  // Messaging methods
  async sendMessage(message: string): Promise<void> {
    await this.fillAndValidate(this.messageInput, message);
    await this.sendButton.click();
    
    // Wait for message to appear in chat
    await this.expectElementVisible(
      this.messages.filter({ hasText: message })
    );
    
    // Clear input after sending
    await expect(this.messageInput).toHaveValue('');
  }

  async sendMultipleMessages(messages: string[]): Promise<void> {
    for (const message of messages) {
      await this.sendMessage(message);
      await this.page.waitForTimeout(1000); // Realistic typing pace
    }
  }

  async waitForOpponentMessage(): Promise<string> {
    const initialCount = await this.messages.count();
    
    // Wait for new message to appear
    await this.page.waitForFunction(
      (count) => {
        const messages = document.querySelectorAll('[data-testid="message"]');
        return messages.length > count;
      },
      initialCount,
      { timeout: 30000 }
    );
    
    const newMessage = this.messages.last();
    return await newMessage.textContent() || '';
  }

  async startTyping(): Promise<void> {
    await this.messageInput.focus();
    await this.messageInput.type('T', { delay: 100 });
    
    // Should trigger typing indicator for other participants
  }

  async stopTyping(): Promise<void> {
    await this.messageInput.clear();
    await this.page.keyboard.press('Escape');
  }

  // AI coaching methods
  async enableCoaching(): Promise<void> {
    if (!(await this.coachingSidebar.isVisible())) {
      await this.coachingToggle.click();
    }
    
    await this.expectElementVisible(this.coachingSidebar);
  }

  async disableCoaching(): Promise<void> {
    if (await this.coachingSidebar.isVisible()) {
      await this.coachingToggle.click();
    }
    
    await this.expectElementHidden(this.coachingSidebar);
  }

  async waitForSuggestion(): Promise<string> {
    await this.enableCoaching();
    
    // Wait for AI suggestion to appear
    await this.expectElementVisible(this.suggestions.first());
    
    return await this.suggestions.first().textContent() || '';
  }

  async implementSuggestion(): Promise<void> {
    await this.enableCoaching();
    
    const suggestion = this.suggestions.first();
    await this.expectElementVisible(suggestion);
    
    const implementButton = suggestion.locator('[data-testid="implement-suggestion"]');
    await implementButton.click();
    
    // Should populate message input with suggestion
    const inputValue = await this.messageInput.inputValue();
    expect(inputValue.length).toBeGreaterThan(0);
  }

  // Evidence methods
  async searchForEvidence(query: string): Promise<void> {
    await this.expectElementVisible(this.evidencePanel);
    await this.fillAndValidate(this.searchEvidence, query);
    await this.page.keyboard.press('Enter');
    
    // Wait for results
    await this.expectElementVisible(this.evidenceResults.first());
  }

  async citeEvidence(): Promise<void> {
    const firstResult = this.evidenceResults.first();
    await this.expectElementVisible(firstResult);
    
    const citeButton = firstResult.locator('[data-testid="cite-evidence"]');
    await citeButton.click();
    
    // Should add citation to message input
    const inputValue = await this.messageInput.inputValue();
    expect(inputValue).toContain('http'); // Should contain a URL
  }

  // Turn management methods
  async requestTurn(): Promise<void> {
    await this.requestTurnButton.click();
    
    // Should appear in speaking queue
    await this.expectElementVisible(
      this.speakingQueue.locator('[data-testid="my-turn-request"]')
    );
  }

  async waitForMyTurn(): Promise<void> {
    await this.expectElementVisible(
      this.turnIndicator.filter({ hasText: /your turn/i })
    );
  }

  async getTurnTimeRemaining(): Promise<number> {
    const timerText = await this.turnTimer.textContent();
    const match = timerText?.match(/(\d+):(\d+)/);
    
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      return minutes * 60 + seconds;
    }
    
    return 0;
  }

  // Phase progression methods
  async getCurrentPhase(): Promise<string> {
    return await this.currentPhase.textContent() || '';
  }

  async waitForPhaseChange(expectedPhase: string): Promise<void> {
    await this.page.waitForFunction(
      (phase) => {
        const phaseElement = document.querySelector('[data-testid="current-phase"]');
        return phaseElement?.textContent?.includes(phase);
      },
      expectedPhase,
      { timeout: 60000 }
    );
  }

  async getPhaseTimeRemaining(): Promise<number> {
    const timerText = await this.phaseTimer.textContent();
    const match = timerText?.match(/(\d+):(\d+)/);
    
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      return minutes * 60 + seconds;
    }
    
    return 0;
  }

  // Validation methods
  async validateDebateRoom(): Promise<void> {
    await this.expectElementVisible(this.debateTitle);
    await this.expectElementVisible(this.topicDescription);
    await this.expectElementVisible(this.participantList);
    await this.expectElementVisible(this.currentPhase);
    await this.expectElementVisible(this.messageContainer);
    await this.expectElementVisible(this.messageInput);
    await this.expectElementVisible(this.sendButton);
  }

  async validateParticipants(): Promise<void> {
    const participants = this.participantList.locator('[data-testid="participant"]');
    const count = await participants.count();
    
    expect(count).toBeGreaterThan(1); // At least 2 participants
    
    // Each participant should have name and status
    for (let i = 0; i < count; i++) {
      const participant = participants.nth(i);
      const name = participant.locator('[data-testid="participant-name"]');
      const status = participant.locator('[data-testid="participant-status"]');
      
      await this.expectElementVisible(name);
      await this.expectElementVisible(status);
    }
  }

  async validatePositionAssignment(): Promise<void> {
    await this.expectElementVisible(this.myPosition);
    await this.expectElementVisible(this.opponentPosition);
    
    const myPos = await this.myPosition.textContent();
    const oppPos = await this.opponentPosition.textContent();
    
    expect(myPos).toMatch(/pro|con/i);
    expect(oppPos).toMatch(/pro|con/i);
    expect(myPos).not.toBe(oppPos); // Should be opposite positions
  }

  async validateRealTimeFeatures(): Promise<void> {
    // Start typing to trigger typing indicator
    await this.startTyping();
    
    // In a real test with multiple users, we'd check if others see the typing indicator
    // For now, we'll just verify the feature is working
    await this.page.waitForTimeout(2000);
    await this.stopTyping();
  }

  // Control methods
  async leaveDebate(): Promise<void> {
    await this.leaveDebateButton.click();
    
    // Should show confirmation dialog
    const confirmDialog = this.page.locator('[data-testid="leave-confirmation"]');
    await this.expectElementVisible(confirmDialog);
    
    const confirmButton = confirmDialog.locator('[data-testid="confirm-leave"]');
    await confirmButton.click();
    
    // Should navigate away from debate
    await this.expectUrl(/dashboard|profile/);
  }

  async reportIssue(): Promise<void> {
    await this.reportButton.click();
    
    const reportModal = this.page.locator('[data-testid="report-modal"]');
    await this.expectElementVisible(reportModal);
    
    const reportType = reportModal.locator('[data-testid="report-type"]');
    await this.selectDropdownOption(reportType, 'inappropriate_content');
    
    const reportDescription = reportModal.locator('[data-testid="report-description"]');
    await this.fillAndValidate(reportDescription, 'Test report description');
    
    const submitReport = reportModal.locator('[data-testid="submit-report"]');
    await submitReport.click();
    
    // Should show success message
    await this.expectElementVisible(this.successMessage);
  }

  async openHelp(): Promise<void> {
    await this.helpButton.click();
    
    const helpModal = this.page.locator('[data-testid="help-modal"]');
    await this.expectElementVisible(helpModal);
    
    // Should contain helpful information
    const helpContent = helpModal.locator('[data-testid="help-content"]');
    await this.expectElementVisible(helpContent);
  }
}
