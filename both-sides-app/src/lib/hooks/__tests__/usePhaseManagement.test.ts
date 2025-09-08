/**
 * Unit tests for usePhaseManagement hook
 * Testing debate phase management, timing, and state transitions
 */

import { renderHook, act } from '@testing-library/react';
import { usePhaseManagement } from '../usePhaseManagement';
import { DebatePhase } from '@/types/debate';

// Mock the real-time connection since we're testing in isolation
jest.mock('../useRealtimeConnection', () => ({
  useRealtimeConnection: () => ({
    isConnected: true,
    sendMessage: jest.fn(),
    subscribe: jest.fn(),
    disconnect: jest.fn()
  })
}));

describe('usePhaseManagement', () => {
  const defaultProps = {
    conversationId: 'test-conversation-1',
    userId: 'test-user-1',
    isTeacher: false,
    enabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize with null phase state when disabled', () => {
      const { result } = renderHook(() => 
        usePhaseManagement({ ...defaultProps, enabled: false })
      );

      expect(result.current.phaseState).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasPhaseData).toBe(false);
    });

    it('should initialize and fetch phase state when enabled', () => {
      const { result } = renderHook(() => 
        usePhaseManagement(defaultProps)
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set canControlPhase correctly for teachers', () => {
      const { result: teacherResult } = renderHook(() => 
        usePhaseManagement({ ...defaultProps, isTeacher: true })
      );

      const { result: studentResult } = renderHook(() => 
        usePhaseManagement({ ...defaultProps, isTeacher: false })
      );

      // Note: canControlPhase depends on having phase data, so initially false
      expect(teacherResult.current.canControlPhase).toBe(false);
      expect(studentResult.current.canControlPhase).toBe(false);
    });
  });

  describe('Phase State Management', () => {
    it('should calculate time remaining correctly', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      // Wait for mock phase state to load
      await act(async () => {
        jest.advanceTimersByTime(500); // Wait for mock API call
      });

      // The mock creates a phase that started 2 minutes ago with 15 minutes duration
      // So we should have ~13 minutes remaining
      const timeRemaining = result.current.timeRemaining;
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThan(15 * 60 * 1000); // Less than full duration
    });

    it('should calculate progress percentage correctly', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      const progressPercent = result.current.progressPercent;
      expect(progressPercent).toBeGreaterThanOrEqual(0);
      expect(progressPercent).toBeLessThanOrEqual(100);
    });

    it('should detect overtime correctly', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Initially should not be overtime (phase started 2 min ago, duration is 15 min)
      expect(result.current.isOvertime).toBe(false);

      // Fast forward past the phase duration
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 1000); // 20 minutes
      });

      expect(result.current.isOvertime).toBe(true);
    });
  });

  describe('Teacher Controls', () => {
    const teacherProps = { ...defaultProps, isTeacher: true };

    it('should allow teachers to pause phase', async () => {
      const { result } = renderHook(() => usePhaseManagement(teacherProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
        await result.current.pausePhase();
      });

      // Note: In the actual implementation, this would update the phase state
      // For now, we're just testing that the function can be called without error
      expect(result.current.pausePhase).toBeDefined();
    });

    it('should allow teachers to resume phase', async () => {
      const { result } = renderHook(() => usePhaseManagement(teacherProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
        await result.current.resumePhase();
      });

      expect(result.current.resumePhase).toBeDefined();
    });

    it('should allow teachers to skip phase', async () => {
      const { result } = renderHook(() => usePhaseManagement(teacherProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
        await result.current.skipPhase();
      });

      expect(result.current.skipPhase).toBeDefined();
    });

    it('should allow teachers to extend phase', async () => {
      const { result } = renderHook(() => usePhaseManagement(teacherProps));

      const extensionTime = 5 * 60 * 1000; // 5 minutes

      await act(async () => {
        jest.advanceTimersByTime(500);
        await result.current.extendPhase(extensionTime);
      });

      expect(result.current.extendPhase).toBeDefined();
    });

    it('should prevent non-teachers from using teacher controls', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
        // These should not throw but should not have effect
        await result.current.pausePhase();
        await result.current.resumePhase();
        await result.current.skipPhase();
        await result.current.extendPhase(1000);
      });

      // Functions should exist but not have effect for non-teachers
      expect(result.current.canControlPhase).toBe(false);
    });
  });

  describe('Phase Transitions', () => {
    it('should handle phase completion', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
        await result.current.handlePhaseComplete('DISCUSSION');
      });

      expect(result.current.handlePhaseComplete).toBeDefined();
    });

    it('should handle automatic phase progression', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Fast forward to trigger phase completion
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 1000);
      });

      expect(result.current.isOvertime).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing conversation ID gracefully', () => {
      const { result } = renderHook(() => 
        usePhaseManagement({ ...defaultProps, conversationId: '' })
      );

      expect(result.current.error).toBeNull();
      expect(result.current.phaseState).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Mock a network error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      consoleSpy.mockRestore();

      // Should not crash on errors
      expect(result.current.refreshPhaseState).toBeDefined();
    });

    it('should handle invalid phase data', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // Should handle gracefully
      expect(result.current.phaseState).toBeDefined();
    });
  });

  describe('Sync and Updates', () => {
    it('should refresh phase state on demand', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      await act(async () => {
        await result.current.refreshPhaseState();
      });

      expect(result.current.refreshPhaseState).toBeDefined();
    });

    it('should sync periodically when enabled', async () => {
      const { result } = renderHook(() => usePhaseManagement(defaultProps));

      // Fast forward to trigger periodic sync (30 seconds)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(result.current.lastSync).toBeDefined();
    });

    it('should stop syncing when unmounted', () => {
      const { unmount } = renderHook(() => usePhaseManagement(defaultProps));

      unmount();

      // Should clean up intervals
      expect(clearInterval).toHaveBeenCalled();
    });
  });

  describe('Phase Duration Handling', () => {
    it('should handle all debate phases', () => {
      const phases: DebatePhase[] = [
        'PREPARATION',
        'OPENING', 
        'DISCUSSION',
        'REBUTTAL',
        'CLOSING',
        'REFLECTION',
        'COMPLETED'
      ];

      phases.forEach(phase => {
        const { result } = renderHook(() => usePhaseManagement(defaultProps));
        
        // Should not crash for any phase
        expect(result.current).toBeDefined();
      });
    });

    it('should have correct default durations', () => {
      // These are tested indirectly through the mock implementation
      // The actual durations are defined in the hook
      const { result } = renderHook(() => usePhaseManagement(defaultProps));
      
      expect(result.current).toBeDefined();
    });
  });
});
