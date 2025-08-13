/**
 * Vector utility functions for AI embeddings and similarity calculations
 * Compatible with OpenAI embeddings (1536 dimensions) and pgvector extension
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical vectors
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity score
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values indicate more similar vectors
 * @param a First vector
 * @param b Second vector
 * @returns Euclidean distance
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

/**
 * Normalize a vector to unit length
 * @param vector Input vector
 * @returns Normalized vector
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitude === 0) {
    return vector.slice(); // Return copy of zero vector
  }
  
  return vector.map(val => val / magnitude);
}

/**
 * Convert vector array to pgvector-compatible string format
 * @param vector Number array
 * @returns Formatted vector string for database
 */
export function vectorToString(vector: number[]): string {
  return `[${vector.join(',')}]`;
}

/**
 * Parse pgvector string format back to number array
 * @param vectorString Database vector string
 * @returns Number array
 */
export function stringToVector(vectorString: string): number[] {
  // Remove brackets and split by comma
  const cleaned = vectorString.replace(/[\[\]]/g, '');
  return cleaned.split(',').map(s => parseFloat(s.trim()));
}

/**
 * Validate vector dimensions for OpenAI compatibility
 * @param vector Vector to validate
 * @param expectedDimensions Expected number of dimensions (default: 1536)
 * @throws Error if dimensions don't match
 */
export function validateVectorDimensions(
  vector: number[], 
  expectedDimensions: number = 1536
): void {
  if (vector.length !== expectedDimensions) {
    throw new Error(
      `Vector has ${vector.length} dimensions, expected ${expectedDimensions}`
    );
  }
}

/**
 * Generate a random vector for testing purposes
 * @param dimensions Number of dimensions
 * @returns Random normalized vector
 */
export function generateRandomVector(dimensions: number = 1536): number[] {
  const vector = Array.from({ length: dimensions }, () => 
    (Math.random() - 0.5) * 2 // Random values between -1 and 1
  );
  return normalizeVector(vector);
}

/**
 * Standard vector dimension constants
 */
export const VECTOR_DIMENSIONS = {
  OPENAI_ADA_002: 1536,
  OPENAI_TEXT_3_SMALL: 1536,
  OPENAI_TEXT_3_LARGE: 3072,
} as const;

export type VectorDimension = typeof VECTOR_DIMENSIONS[keyof typeof VECTOR_DIMENSIONS];
