/**
 * Unit tests for validation utilities
 * Testing data validation and sanitization functions
 */

// Simple validation functions for testing
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('user@domain.c')).toBe(true); // Single char TLD
      expect(validateEmail('a@b.co')).toBe(true); // Minimal valid email
      expect(validateEmail('user name@domain.com')).toBe(false); // Space in local part
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous HTML characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('Hello <b>World</b>')).toBe('Hello bWorld/b');
      expect(sanitizeInput('Normal text')).toBe('Normal text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello world  ')).toBe('hello world');
      expect(sanitizeInput('\t\ntest\t\n')).toBe('test');
    });

    it('should handle empty and special inputs', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('');
      expect(sanitizeInput('<>')).toBe('');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('StrongPass123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Short1');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require uppercase letters', () => {
      const result = validatePassword('lowercase123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require lowercase letters', () => {
      const result = validatePassword('UPPERCASE123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require numbers', () => {
      const result = validatePassword('NoNumbers');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should accumulate multiple errors', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4); // All validation rules failed
    });

    it('should handle edge cases', () => {
      expect(validatePassword('').isValid).toBe(false);
      expect(validatePassword('12345678').isValid).toBe(false); // Only numbers
      expect(validatePassword('Abcdefgh').isValid).toBe(false); // No numbers
    });
  });

  describe('Data sanitization edge cases', () => {
    it('should handle unicode characters', () => {
      expect(sanitizeInput('Hello 世界')).toBe('Hello 世界');
      expect(sanitizeInput('🎉 Test 🎯')).toBe('🎉 Test 🎯');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);
      expect(sanitizeInput(longString)).toBe(longString);
    });

    it('should handle mixed content', () => {
      const mixed = '  <script>Normal text</script>  ';
      expect(sanitizeInput(mixed)).toBe('scriptNormal text/script');
    });
  });
});
