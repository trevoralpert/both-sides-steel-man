# Vector Extension Setup Documentation

## Overview
This document outlines the pgvector extension setup and vector utility functions for AI embeddings in the Both Sides MVP.

## pgvector Extension Status ✅
- **Extension**: Enabled in Neon PostgreSQL database
- **Version**: Latest available through Neon
- **Support**: Full vector operations including distance calculations
- **Dimensions**: Configured for OpenAI embeddings (1536 dimensions)

## Prisma Schema Integration ✅
The `Embedding` model in Prisma schema includes vector support:

```prisma
model Embedding {
  id          String @id @default(cuid())
  entityType  String // "user_profile", "debate_topic", "message"
  entityId    String
  
  // Vector embedding (uses pgvector extension)
  embedding   Unsupported("vector(1536)") // OpenAI ada-002 dimensions
  
  // Metadata
  model       String @default("text-embedding-ada-002")
  createdAt   DateTime @default(now())
  
  @@unique([entityType, entityId])
  @@map("embeddings")
}
```

## Vector Utility Functions ✅
Located in `src/common/utils/vector.utils.ts`:

### Core Functions
- `cosineSimilarity(a, b)` - Calculate cosine similarity between vectors
- `euclideanDistance(a, b)` - Calculate Euclidean distance
- `normalizeVector(vector)` - Normalize vector to unit length

### Helper Functions
- `vectorToString(vector)` - Convert array to pgvector string format
- `stringToVector(string)` - Parse pgvector string to array
- `validateVectorDimensions(vector, expected)` - Validate vector dimensions
- `generateRandomVector(dimensions)` - Generate random test vectors

### Constants
- `VECTOR_DIMENSIONS.OPENAI_ADA_002` = 1536
- `VECTOR_DIMENSIONS.OPENAI_TEXT_3_SMALL` = 1536  
- `VECTOR_DIMENSIONS.OPENAI_TEXT_3_LARGE` = 3072

## Database Operations
### Supported pgvector Operations
- Distance calculation: `embedding <-> '[1,2,3]'`
- Cosine similarity: `1 - (embedding <=> '[1,2,3]')`
- Inner product: `embedding <#> '[1,2,3]'`

### Query Examples
```sql
-- Find most similar embeddings
SELECT entityId, embedding <-> '[0.1,0.2,0.3,...]' AS distance 
FROM embeddings 
WHERE entityType = 'user_profile' 
ORDER BY distance 
LIMIT 10;

-- Cosine similarity search
SELECT entityId, 1 - (embedding <=> '[0.1,0.2,0.3,...]') AS similarity
FROM embeddings 
WHERE entityType = 'debate_topic'
ORDER BY similarity DESC;
```

## Usage in Application

### TypeScript Integration
```typescript
import { cosineSimilarity, VECTOR_DIMENSIONS } from '@/common/utils/vector.utils';
import { PrismaService } from '@/prisma/prisma.service';

// Store embedding
await prisma.embedding.create({
  data: {
    entityType: 'user_profile',
    entityId: userId,
    embedding: vectorToString(embeddingArray), // Convert to string format
    model: 'text-embedding-ada-002'
  }
});

// Find similar profiles
const results = await prisma.$queryRaw`
  SELECT entityId, embedding <-> ${vectorToString(queryVector)}::vector AS distance
  FROM embeddings 
  WHERE entityType = 'user_profile'
  ORDER BY distance
  LIMIT 5
`;
```

## Performance Considerations
- Create indexes on vector columns for large datasets
- Consider vector dimensions based on your AI model
- Use appropriate distance metrics for your use case
- Monitor query performance with large vector sets

## Future Enhancements
- HNSW indexing for large-scale similarity search
- Batch embedding operations
- Vector clustering algorithms
- Integration with OpenAI embedding API
