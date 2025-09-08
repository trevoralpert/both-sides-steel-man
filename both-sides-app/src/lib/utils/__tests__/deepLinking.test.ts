/**
 * Unit tests for deep linking utilities
 * Testing URL generation, parsing, and navigation functions
 */

import { generateDebateLink, parseDebateLink, validateDebateAccess } from '../deepLinking';

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test',
}));

describe('Deep Linking Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDebateLink', () => {
    it('should generate valid debate links', () => {
      const link = generateDebateLink({
        conversationId: 'conv-123',
        userId: 'user-456',
        phase: 'DISCUSSION'
      });

      expect(link).toContain('/debate/conv-123');
      expect(link).toContain('userId=user-456');
      expect(link).toContain('phase=DISCUSSION');
    });

    it('should handle optional parameters', () => {
      const link = generateDebateLink({
        conversationId: 'conv-123',
        userId: 'user-456'
      });

      expect(link).toContain('/debate/conv-123');
      expect(link).toContain('userId=user-456');
      expect(link).not.toContain('phase=');
    });

    it('should encode special characters', () => {
      const link = generateDebateLink({
        conversationId: 'conv-123',
        userId: 'user-456',
        returnUrl: '/dashboard?tab=active&filter=recent'
      });

      expect(link).toContain('returnUrl=');
      expect(decodeURIComponent(link)).toContain('/dashboard?tab=active&filter=recent');
    });

    it('should handle empty or invalid inputs', () => {
      expect(() => generateDebateLink({
        conversationId: '',
        userId: 'user-456'
      })).toThrow('Conversation ID is required');

      expect(() => generateDebateLink({
        conversationId: 'conv-123',
        userId: ''
      })).toThrow('User ID is required');
    });
  });

  describe('parseDebateLink', () => {
    it('should parse valid debate links', () => {
      const url = '/debate/conv-123?userId=user-456&phase=DISCUSSION&returnUrl=%2Fdashboard';
      const parsed = parseDebateLink(url);

      expect(parsed.conversationId).toBe('conv-123');
      expect(parsed.userId).toBe('user-456');
      expect(parsed.phase).toBe('DISCUSSION');
      expect(parsed.returnUrl).toBe('/dashboard');
    });

    it('should handle missing optional parameters', () => {
      const url = '/debate/conv-123?userId=user-456';
      const parsed = parseDebateLink(url);

      expect(parsed.conversationId).toBe('conv-123');
      expect(parsed.userId).toBe('user-456');
      expect(parsed.phase).toBeUndefined();
      expect(parsed.returnUrl).toBeUndefined();
    });

    it('should handle malformed URLs', () => {
      expect(() => parseDebateLink('/invalid-url')).toThrow('Invalid debate link format');
      expect(() => parseDebateLink('/debate/')).toThrow('Invalid debate link format');
      expect(() => parseDebateLink('')).toThrow('Invalid debate link format');
    });

    it('should handle URL encoding correctly', () => {
      const encodedUrl = '/debate/conv-123?userId=user-456&returnUrl=%2Fdashboard%3Ftab%3Dactive';
      const parsed = parseDebateLink(encodedUrl);

      expect(parsed.returnUrl).toBe('/dashboard?tab=active');
    });
  });

  describe('validateDebateAccess', () => {
    it('should validate access for authorized users', async () => {
      const mockUser = { id: 'user-456', role: 'student' };
      const mockConversation = { 
        id: 'conv-123', 
        participants: ['user-456', 'user-789'],
        status: 'active'
      };

      const hasAccess = await validateDebateAccess(mockUser, mockConversation);
      expect(hasAccess).toBe(true);
    });

    it('should reject access for unauthorized users', async () => {
      const mockUser = { id: 'user-999', role: 'student' };
      const mockConversation = { 
        id: 'conv-123', 
        participants: ['user-456', 'user-789'],
        status: 'active'
      };

      const hasAccess = await validateDebateAccess(mockUser, mockConversation);
      expect(hasAccess).toBe(false);
    });

    it('should allow teacher access to any conversation', async () => {
      const mockTeacher = { id: 'teacher-123', role: 'teacher' };
      const mockConversation = { 
        id: 'conv-123', 
        participants: ['user-456', 'user-789'],
        status: 'active'
      };

      const hasAccess = await validateDebateAccess(mockTeacher, mockConversation);
      expect(hasAccess).toBe(true);
    });

    it('should reject access to inactive conversations', async () => {
      const mockUser = { id: 'user-456', role: 'student' };
      const mockConversation = { 
        id: 'conv-123', 
        participants: ['user-456', 'user-789'],
        status: 'completed'
      };

      const hasAccess = await validateDebateAccess(mockUser, mockConversation);
      expect(hasAccess).toBe(false);
    });

    it('should handle edge cases', async () => {
      // Null/undefined inputs
      expect(await validateDebateAccess(null as any, {} as any)).toBe(false);
      expect(await validateDebateAccess({} as any, null as any)).toBe(false);

      // Empty participants array
      const mockUser = { id: 'user-456', role: 'student' };
      const emptyConversation = { 
        id: 'conv-123', 
        participants: [],
        status: 'active'
      };
      expect(await validateDebateAccess(mockUser, emptyConversation)).toBe(false);
    });
  });

  describe('URL generation edge cases', () => {
    it('should handle very long conversation IDs', () => {
      const longId = 'conv-' + 'a'.repeat(1000);
      const link = generateDebateLink({
        conversationId: longId,
        userId: 'user-456'
      });

      expect(link).toContain(longId);
    });

    it('should handle special characters in IDs', () => {
      const link = generateDebateLink({
        conversationId: 'conv-123_test',
        userId: 'user-456_test'
      });

      expect(link).toContain('conv-123_test');
      expect(link).toContain('user-456_test');
    });

    it('should handle multiple query parameters', () => {
      const link = generateDebateLink({
        conversationId: 'conv-123',
        userId: 'user-456',
        phase: 'DISCUSSION',
        returnUrl: '/dashboard',
        timestamp: new Date('2024-01-01').toISOString()
      });

      expect(link).toContain('phase=DISCUSSION');
      expect(link).toContain('returnUrl=');
      expect(link).toContain('timestamp=');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle full debate flow navigation', () => {
      // Generate link
      const link = generateDebateLink({
        conversationId: 'conv-123',
        userId: 'user-456',
        phase: 'PREPARATION',
        returnUrl: '/dashboard'
      });

      // Parse the generated link
      const parsed = parseDebateLink(link);

      expect(parsed.conversationId).toBe('conv-123');
      expect(parsed.userId).toBe('user-456');
      expect(parsed.phase).toBe('PREPARATION');
      expect(parsed.returnUrl).toBe('/dashboard');
    });

    it('should maintain data integrity through encode/decode cycle', () => {
      const originalData = {
        conversationId: 'conv-123',
        userId: 'user-456',
        returnUrl: '/dashboard?tab=debates&filter=active&sort=recent'
      };

      const link = generateDebateLink(originalData);
      const parsed = parseDebateLink(link);

      expect(parsed.conversationId).toBe(originalData.conversationId);
      expect(parsed.userId).toBe(originalData.userId);
      expect(parsed.returnUrl).toBe(originalData.returnUrl);
    });
  });
});
