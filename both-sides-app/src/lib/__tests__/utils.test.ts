import { cn } from '../utils';

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('px-2 py-1', 'bg-blue-500');
    expect(result).toBe('px-2 py-1 bg-blue-500');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('handles false conditional classes', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class');
  });

  it('merges conflicting Tailwind classes correctly', () => {
    // twMerge should handle conflicting classes
    const result = cn('px-2 px-4', 'py-1 py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles arrays of classes', () => {
    const result = cn(['px-2', 'py-1'], ['bg-blue-500', 'text-white']);
    expect(result).toBe('px-2 py-1 bg-blue-500 text-white');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      'base-class': true,
      'active-class': true,
      'inactive-class': false,
    });
    expect(result).toBe('base-class active-class');
  });

  it('handles mixed input types', () => {
    const result = cn(
      'base-class',
      ['array-class'],
      { 'object-class': true, 'false-class': false },
      'final-class'
    );
    expect(result).toBe('base-class array-class object-class final-class');
  });

  it('handles undefined and null values', () => {
    const result = cn('base-class', undefined, null, 'final-class');
    expect(result).toBe('base-class final-class');
  });

  it('handles empty strings', () => {
    const result = cn('base-class', '', 'final-class');
    expect(result).toBe('base-class final-class');
  });

  it('returns empty string for no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
