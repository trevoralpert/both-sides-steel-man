# Prisma Setup Documentation

## Overview
This document outlines the Prisma ORM setup for the Both Sides MVP backend.

## Current Status ✅
- **Prisma Client**: Generated and working
- **Database Connection**: Connected to Neon PostgreSQL
- **Migrations**: Tooling set up and configured
- **NestJS Integration**: PrismaModule and PrismaService configured
- **Vector Extension**: Enabled for AI embeddings

## Available Scripts
```bash
yarn db:generate    # Generate Prisma client
yarn db:push        # Push schema changes (dev only)
yarn db:migrate     # Run database migrations
yarn db:studio      # Open Prisma Studio
```

## Key Files
- `prisma/schema.prisma` - Database schema with all models
- `src/prisma/prisma.service.ts` - NestJS service with connection management
- `src/prisma/prisma.module.ts` - Global NestJS module
- `sql/setup-extensions.sql` - Database extension setup

## Integration
The PrismaService is globally available throughout the NestJS application and includes:
- Automatic connection management
- Graceful shutdown hooks
- Environment-based configuration

## Vector Extension Notes
- pgvector extension is enabled for AI embeddings
- Shadow database limitations with custom extensions are handled through manual setup
- Embedding model supports 1536-dimensional vectors (OpenAI compatible)

## Usage Example
```typescript
constructor(private prisma: PrismaService) {}

async findUsers() {
  return this.prisma.user.findMany();
}
```
