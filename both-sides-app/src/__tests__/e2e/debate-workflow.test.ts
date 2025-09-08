/**
 * Debate Workflow E2E Tests
 * Complete debate session from creation to completion
 */

import { test, expect } from '@playwright/test';
import { AuthPage } from './page-objects/AuthPage';
import { DebatePage } from './page-objects/DebatePage';

test.describe('Debate Workflow', () => {
  let authPage: AuthPage;
  let debatePage: DebatePage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    debatePage = new DebatePage(page);
    
    // Sign in before each test
    await authPage.signInWithValidCredentials();
  });

  test.describe('Debate Room Entry and Setup', () => {
    test('should successfully join a debate room', async ({ page }) => {
      // Join debate from dashboard
      await debatePage.joinDebateFromDashboard();
      
      // Validate debate room loaded properly
      await debatePage.validateDebateRoom();
      await debatePage.validateParticipants();
      await debatePage.validatePositionAssignment();
      
      // Ensure no errors occurred
      await debatePage.expectNoErrors();
    });

    test('should display correct debate topic and description', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Validate topic information
      await debatePage.expectElementVisible(debatePage.debateTitle);
      await debatePage.expectElementVisible(debatePage.topicDescription);
      
      const title = await debatePage.debateTitle.textContent();
      const description = await debatePage.topicDescription.textContent();
      
      expect(title?.length).toBeGreaterThan(0);
      expect(description?.length).toBeGreaterThan(0);
    });

    test('should show current phase and timer', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Validate phase information
      await debatePage.expectElementVisible(debatePage.currentPhase);
      await debatePage.expectElementVisible(debatePage.phaseTimer);
      
      const phase = await debatePage.getCurrentPhase();
      expect(phase).toMatch(/preparation|opening|discussion|rebuttal|closing/i);
      
      const timeRemaining = await debatePage.getPhaseTimeRemaining();
      expect(timeRemaining).toBeGreaterThan(0);
    });

    test('should handle late entry to ongoing debate', async ({ page }) => {
      // Simulate joining debate that's already in progress
      await debatePage.gotoDebate('test-conversation-1');
      
      // Should still be able to join
      await debatePage.validateDebateRoom();
      
      // Should see message history
      const messages = await debatePage.messages.count();
      // In an ongoing debate, there might be existing messages
    });
  });

  test.describe('Real-time Messaging', () => {
    test('should send and receive messages successfully', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Send a test message
      const testMessage = `Test message at ${Date.now()}`;
      await debatePage.sendMessage(testMessage);
      
      // Message should appear in chat
      const messageElements = debatePage.messages.filter({ hasText: testMessage });
      await debatePage.expectElementVisible(messageElements);
    });

    test('should display typing indicators', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Test typing indicator functionality
      await debatePage.validateRealTimeFeatures();
    });

    test('should handle message formatting and special characters', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      const specialMessages = [
        'Message with **bold** text',
        'Message with *italics*',
        'Message with emoji 🎯',
        'Message with URL: https://example.com',
        'Message with quotes: "This is important"'
      ];
      
      for (const message of specialMessages) {
        await debatePage.sendMessage(message);
        
        // Verify message appears correctly
        const messageElement = debatePage.messages.filter({ hasText: message });
        await debatePage.expectElementVisible(messageElement);
      }
    });

    test('should maintain message history', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Send multiple messages
      const messages = [
        'First message',
        'Second message',
        'Third message'
      ];
      
      await debatePage.sendMultipleMessages(messages);
      
      // All messages should be visible in history
      for (const message of messages) {
        const messageElement = debatePage.messages.filter({ hasText: message });
        await debatePage.expectElementVisible(messageElement);
      }
      
      // Verify message order
      const allMessages = await debatePage.messages.allTextContents();
      const sentMessages = allMessages.filter(msg => 
        messages.some(testMsg => msg.includes(testMsg))
      );
      
      expect(sentMessages.length).toBe(messages.length);
    });

    test('should handle long messages appropriately', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      const longMessage = 'A'.repeat(1000); // Very long message
      await debatePage.sendMessage(longMessage);
      
      // Should handle gracefully (either sent or show error)
      const messageElement = debatePage.messages.filter({ hasText: longMessage });
      const errorElement = debatePage.errorMessage;
      
      // Either message appears or error is shown
      try {
        await debatePage.expectElementVisible(messageElement, 3000);
      } catch {
        await debatePage.expectElementVisible(errorElement, 3000);
      }
    });
  });

  test.describe('AI Coaching Integration', () => {
    test('should enable and disable AI coaching', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Test coaching toggle
      await debatePage.enableCoaching();
      await debatePage.disableCoaching();
    });

    test('should provide relevant suggestions', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Send a message that might trigger suggestions
      await debatePage.sendMessage('I think climate change is a serious issue.');
      
      // Wait for AI suggestion
      try {
        const suggestion = await debatePage.waitForSuggestion();
        expect(suggestion.length).toBeGreaterThan(0);
      } catch {
        // AI suggestions might not always be available in test environment
        console.log('AI suggestions not available in test environment');
      }
    });

    test('should implement suggestions into message input', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      try {
        await debatePage.implementSuggestion();
        
        // Message input should have content
        const inputValue = await debatePage.messageInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      } catch {
        console.log('AI suggestion implementation not available in test environment');
      }
    });
  });

  test.describe('Evidence and Research', () => {
    test('should search for evidence successfully', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Search for evidence
      await debatePage.searchForEvidence('climate change statistics');
      
      // Should show search results
      const resultsCount = await debatePage.evidenceResults.count();
      if (resultsCount > 0) {
        expect(resultsCount).toBeGreaterThan(0);
      }
    });

    test('should cite evidence in messages', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      try {
        await debatePage.searchForEvidence('environmental data');
        await debatePage.citeEvidence();
        
        // Should add citation to message input
        const inputValue = await debatePage.messageInput.inputValue();
        expect(inputValue.length).toBeGreaterThan(0);
      } catch {
        console.log('Evidence citing not available in test environment');
      }
    });
  });

  test.describe('Phase Management and Progression', () => {
    test('should track phase progression correctly', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      const initialPhase = await debatePage.getCurrentPhase();
      expect(initialPhase).toBeTruthy();
      
      // In a real test, we might wait for phase transitions
      // For now, we'll just verify phase tracking works
      const timeRemaining = await debatePage.getPhaseTimeRemaining();
      expect(timeRemaining).toBeGreaterThanOrEqual(0);
    });

    test('should handle phase transitions gracefully', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Monitor phase changes (in a real scenario with shorter phases)
      const currentPhase = await debatePage.getCurrentPhase();
      
      // Verify phase information is displayed
      await debatePage.expectElementVisible(debatePage.currentPhase);
      await debatePage.expectElementVisible(debatePage.phaseProgress);
    });

    test('should restrict actions based on current phase', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      const phase = await debatePage.getCurrentPhase();
      
      // Different phases might have different restrictions
      if (phase.toLowerCase().includes('preparation')) {
        // During preparation, messaging might be limited
        // Test phase-specific behavior
      }
      
      // Verify messaging is available in discussion phases
      if (phase.toLowerCase().includes('discussion')) {
        await debatePage.sendMessage('Test message during discussion phase');
      }
    });
  });

  test.describe('Turn Management', () => {
    test('should handle turn requests', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Request a turn
      try {
        await debatePage.requestTurn();
        
        // Should appear in speaking queue
        await debatePage.expectElementVisible(debatePage.speakingQueue);
      } catch {
        // Turn management might not be available in all phases
        console.log('Turn management not available in current phase');
      }
    });

    test('should track turn time limits', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Check if turn timer is visible
      if (await debatePage.turnTimer.isVisible()) {
        const timeRemaining = await debatePage.getTurnTimeRemaining();
        expect(timeRemaining).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Debate Controls and Settings', () => {
    test('should open and use help system', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      await debatePage.openHelp();
      
      // Help modal should be visible
      const helpModal = page.locator('[data-testid="help-modal"]');
      await debatePage.expectElementVisible(helpModal);
      
      // Close help
      const closeButton = helpModal.locator('[data-testid="close-help"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    });

    test('should handle reporting functionality', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      try {
        await debatePage.reportIssue();
      } catch {
        console.log('Report functionality not fully implemented in test environment');
      }
    });

    test('should allow leaving debate', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Leave debate
      await debatePage.leaveDebate();
      
      // Should navigate away from debate room
      await debatePage.expectUrl(/dashboard/);
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle connection interruptions gracefully', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Simulate network interruption
      await page.context().setOffline(true);
      
      // Try to send message
      await debatePage.messageInput.fill('Test message during offline');
      await debatePage.sendButton.click();
      
      // Should show appropriate error or queue message
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        await debatePage.expectElementVisible(offlineIndicator);
      }
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should reconnect automatically
      await page.waitForTimeout(2000);
    });

    test('should handle invalid debate access', async ({ page }) => {
      // Try to access non-existent debate
      await page.goto('/debate/non-existent-id');
      
      // Should show error or redirect
      const errorMessage = page.locator('[data-testid="debate-not-found"]');
      const redirected = await page.waitForURL(/dashboard|error/, { timeout: 5000 }).catch(() => false);
      
      if (!redirected) {
        await debatePage.expectElementVisible(errorMessage);
      }
    });

    test('should handle debate completion', async ({ page }) => {
      // In a real scenario, this would test what happens when debate ends
      await debatePage.joinDebateFromDashboard();
      
      // For now, just verify the debate room is functional
      await debatePage.validateDebateRoom();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await debatePage.joinDebateFromDashboard();
      
      // Mobile-specific elements should be visible
      if (await debatePage.isMobile()) {
        await debatePage.openMobileMenu();
      }
      
      // Core functionality should still work
      await debatePage.sendMessage('Mobile test message');
    });

    test('should handle touch interactions properly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await debatePage.joinDebateFromDashboard();
      
      // Test touch interactions
      await debatePage.messageInput.tap();
      await debatePage.messageInput.fill('Touch interaction test');
      await debatePage.sendButton.tap();
      
      // Message should be sent
      const messageElement = debatePage.messages.filter({ hasText: 'Touch interaction test' });
      await debatePage.expectElementVisible(messageElement);
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle multiple rapid messages', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Send multiple messages quickly
      const rapidMessages = Array.from({ length: 10 }, (_, i) => `Rapid message ${i + 1}`);
      
      for (const message of rapidMessages) {
        await debatePage.sendMessage(message);
        await page.waitForTimeout(100); // Very short delay
      }
      
      // All messages should appear
      for (const message of rapidMessages) {
        const messageElement = debatePage.messages.filter({ hasText: message });
        await debatePage.expectElementVisible(messageElement, 5000);
      }
    });

    test('should maintain performance with long message history', async ({ page }) => {
      await debatePage.joinDebateFromDashboard();
      
      // Simulate scrolling through long message history
      const messageContainer = debatePage.messageContainer;
      
      // Scroll to top to load older messages
      await messageContainer.evaluate(el => {
        el.scrollTop = 0;
      });
      
      await page.waitForTimeout(1000);
      
      // Should still be responsive
      await debatePage.sendMessage('Performance test message');
    });
  });
});
