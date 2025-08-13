# Phase 1: Foundation & Core Infrastructure - Detailed Roadmap

## Overview
Phase 1 establishes the foundational architecture for the Both Sides app, setting up project structure, development tooling, authentication, database infrastructure, and backend services in the optimal order to prevent dependency conflicts.

**Goal**: Complete foundational setup that all subsequent phases will build upon.

---

## Step 1.1: Project Setup & Configuration
*Dependencies: None - Starting from scratch*

### Task 1.1.1: Initialize Next.js Project with TypeScript
**Estimated Time**: 30 minutes
**Dependencies**: None

**Implementation Steps**:
1. Create project directory: `mkdir both-sides-app && cd both-sides-app`
2. Initialize Next.js with TypeScript: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
3. Verify project structure and initial build: `npm run dev`
4. Create initial folder structure:
   ```
   src/
   ├── app/
   ├── components/
   ├── lib/
   ├── types/
   └── utils/
   ```
5. Update `next.config.js` with basic optimizations
6. Test hot reload and TypeScript compilation

**Success Criteria**:
- [x] Next.js app runs successfully on localhost:3000
- [x] TypeScript compilation works without errors
- [x] Hot reload functions properly
- [x] Folder structure is organized and ready for development

---

### Task 1.1.2: Configure Tailwind CSS and shadcn/ui Components
**Estimated Time**: 45 minutes
**Dependencies**: Task 1.1.1 complete

**Implementation Steps**:
1. Verify Tailwind CSS is properly configured (should be from create-next-app)
2. Initialize shadcn/ui: `npx shadcn-ui@latest init`
3. Configure `components.json` with appropriate settings:
   ```json
   {
     "style": "default",
     "rsc": true,
     "tsx": true,
     "tailwind": {
       "config": "tailwind.config.js",
       "css": "src/app/globals.css",
       "baseColor": "slate",
       "cssVariables": true
     },
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils"
     }
   }
   ```
4. Install essential shadcn/ui components:
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add card
   npx shadcn-ui@latest add dialog
   npx shadcn-ui@latest add form
   npx shadcn-ui@latest add toast
   ```
5. Create a test component to verify shadcn/ui integration
6. Update global CSS with custom design tokens for the app theme

**Success Criteria**:
- [x] shadcn/ui components render correctly
- [x] Tailwind CSS classes work as expected
- [x] Custom theme colors are applied
- [x] No styling conflicts or console errors

---

### Task 1.1.3: Set Up ESLint, Prettier, and Development Tooling
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.1.1 complete

**Implementation Steps**:
1. Configure ESLint with additional rules for React/TypeScript:
   ```json
   // .eslintrc.json
   {
     "extends": [
       "next/core-web-vitals",
       "@typescript-eslint/recommended",
       "prettier"
     ],
     "rules": {
       "@typescript-eslint/no-unused-vars": "error",
       "@typescript-eslint/no-explicit-any": "warn",
       "prefer-const": "error"
     }
   }
   ```
2. Install and configure Prettier:
   ```bash
   npm install --save-dev prettier eslint-config-prettier
   ```
3. Create `.prettierrc` configuration:
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 80,
     "tabWidth": 2
   }
   ```
4. Add VS Code settings for consistent formatting:
   ```json
   // .vscode/settings.json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode",
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": true
     }
   }
   ```
5. Update package.json scripts:
   ```json
   {
     "scripts": {
       "lint": "next lint",
       "lint:fix": "next lint --fix",
       "format": "prettier --write .",
       "format:check": "prettier --check ."
     }
   }
   ```
6. Run linting and formatting to verify setup

**Success Criteria**:
- [x] ESLint runs without errors
- [x] Prettier formats code consistently
- [x] VS Code auto-formats on save
- [x] No linting errors in existing code

---

### Task 1.1.4: Configure Environment Variables and Secrets Management
**Estimated Time**: 20 minutes
**Dependencies**: Task 1.1.1 complete

**Implementation Steps**:
1. Create environment files:
   ```bash
   touch .env.local .env.example
   ```
2. Set up `.env.example` template:
   ```
   # Database
   DATABASE_URL=
   
   # Authentication (Clerk)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
   CLERK_SECRET_KEY=
   
   # AI Services
   OPENAI_API_KEY=
   
   # Real-time (Ably)
   NEXT_PUBLIC_ABLY_KEY=
   ABLY_SECRET_KEY=
   
   # Redis
   REDIS_URL=
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```
3. Add `.env.local` to `.gitignore` (verify it's already there)
4. Create `src/lib/env.ts` for environment validation:
   ```typescript
   import { z } from 'zod'
   
   const envSchema = z.object({
     NODE_ENV: z.enum(['development', 'production', 'test']),
     NEXT_PUBLIC_APP_URL: z.string().url(),
     DATABASE_URL: z.string().min(1),
     // Add other required env vars as we implement them
   })
   
   export const env = envSchema.parse(process.env)
   ```
5. Install zod for environment validation: `npm install zod`
6. Document environment setup in README

**Success Criteria**:
- [x] Environment files are properly structured
- [x] Environment validation works
- [x] Sensitive files are in .gitignore
- [x] Template file helps team setup

---

### Task 1.1.5: Set Up Git Repository and Initial Commit Structure
**Estimated Time**: 15 minutes
**Dependencies**: Tasks 1.1.1-1.1.4 complete

**Implementation Steps**:
1. Initialize git repository: `git init`
2. Create comprehensive `.gitignore`:
   ```
   # Dependencies
   node_modules/
   
   # Environment variables
   .env.local
   .env.*.local
   
   # Build outputs
   .next/
   out/
   dist/
   
   # IDE
   .vscode/
   .idea/
   
   # OS
   .DS_Store
   Thumbs.db
   
   # Logs
   *.log
   logs/
   
   # Database
   *.db
   *.sqlite
   
   # Testing
   coverage/
   .nyc_output/
   ```
3. Create initial README.md:
   ```markdown
   # Both Sides - AI-Powered Debate & Critical Thinking App
   
   ## Quick Start
   1. Copy `.env.example` to `.env.local`
   2. Fill in required environment variables
   3. Run `npm install`
   4. Run `npm run dev`
   
   ## Development
   - `npm run dev` - Start development server
   - `npm run lint` - Run ESLint
   - `npm run format` - Format with Prettier
   - `npm test` - Run tests
   ```
4. Stage all files: `git add .`
5. Create initial commit: `git commit -m "feat: initial project setup with Next.js, TypeScript, Tailwind, and shadcn/ui"`
6. Set up conventional commit standards for the team

**Success Criteria**:
- [ ] Git repository is initialized
- [ ] All files are properly committed
- [ ] .gitignore excludes sensitive/build files
- [ ] README provides clear setup instructions

---

### Task 1.1.6: Set Up Unit Testing with Jest
**Estimated Time**: 45 minutes
**Dependencies**: Task 1.1.1 complete

**Implementation Steps**:
1. Install testing dependencies:
   ```bash
   npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
   ```
2. Create `jest.config.js`:
   ```javascript
   const nextJest = require('next/jest')
   
   const createJestConfig = nextJest({
     dir: './',
   })
   
   const customJestConfig = {
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     testEnvironment: 'jest-environment-jsdom',
     testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
     collectCoverageFrom: [
       'src/**/*.{js,jsx,ts,tsx}',
       '!src/**/*.d.ts',
       '!src/app/layout.tsx',
       '!src/app/globals.css',
     ],
     coverageThreshold: {
       global: {
         branches: 70,
         functions: 70,
         lines: 70,
         statements: 70,
       },
     },
   }
   
   module.exports = createJestConfig(customJestConfig)
   ```
3. Create `jest.setup.js`:
   ```javascript
   import '@testing-library/jest-dom'
   ```
4. Update package.json scripts:
   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage"
     }
   }
   ```
5. Create first test file `src/components/__tests__/example.test.tsx`:
   ```typescript
   import { render, screen } from '@testing-library/react'
   import { Button } from '@/components/ui/button'
   
   describe('Button Component', () => {
     it('renders button with text', () => {
       render(<Button>Click me</Button>)
       expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
     })
   })
   ```
6. Run tests to verify setup: `npm test`
7. Configure test coverage reporting

**Success Criteria**:
- [x] Jest runs tests successfully
- [x] Testing utilities work correctly
- [x] Coverage reporting is configured
- [x] Example test passes

---

## Step 1.2: Database & Backend Foundation
*Dependencies: Step 1.1 complete*

### Task 1.2.1: Set Up NestJS Backend Project Structure
**Estimated Time**: 1 hour
**Dependencies**: Task 1.1.5 complete

**Implementation Steps**:
1. Create backend directory: `mkdir backend && cd backend`
2. Initialize NestJS project: `npx @nestjs/cli new . --package-manager npm`
3. Install essential dependencies:
   ```bash
   npm install @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
   npm install @prisma/client prisma
   npm install class-validator class-transformer
   npm install @nestjs/websockets @nestjs/platform-socket.io
   ```
4. Install development dependencies:
   ```bash
   npm install --save-dev @types/passport-jwt
   ```
5. Set up project structure:
   ```
   backend/
   ├── src/
   │   ├── auth/
   │   ├── users/
   │   ├── classes/
   │   ├── profiles/
   │   ├── common/
   │   │   ├── guards/
   │   │   ├── decorators/
   │   │   └── filters/
   │   ├── config/
   │   └── prisma/
   ├── prisma/
   └── test/
   ```
6. Configure `main.ts` with global validation and CORS:
   ```typescript
   import { NestFactory } from '@nestjs/core'
   import { ValidationPipe } from '@nestjs/common'
   import { AppModule } from './app.module'
   
   async function bootstrap() {
     const app = await NestFactory.create(AppModule)
     
     app.useGlobalPipes(new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true,
       transform: true,
     }))
     
     app.enableCors({
       origin: process.env.FRONTEND_URL || 'http://localhost:3000',
       credentials: true,
     })
     
     await app.listen(process.env.PORT || 3001)
   }
   bootstrap()
   ```
7. Update backend `.env` file with initial configuration
8. Test NestJS server startup: `npm run start:dev`

**Success Criteria**:
- [ ] NestJS server starts successfully on port 3001
- [ ] Project structure is organized and scalable
- [ ] CORS is configured for frontend communication
- [ ] Global validation is enabled

---

### Task 1.2.2: Configure PostgreSQL Database (Neon for MVP)
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.2.1 complete

**Implementation Steps**:
1. Sign up for Neon PostgreSQL account at neon.tech
2. Create new database project named "both-sides-mvp"
3. Copy connection string from Neon dashboard
4. Add to backend `.env`:
   ```
   DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"
   NODE_ENV=development
   ```
5. Test database connection using a simple query
6. Configure connection pooling settings:
   ```
   # Add to DATABASE_URL
   ?sslmode=require&connection_limit=20&pool_timeout=20
   ```
7. Set up database backup configuration in Neon dashboard
8. Document database setup process for team

**Success Criteria**:
- [x] Database is created and accessible
- [x] Connection string works from backend
- [x] SSL connection is properly configured
- [x] Connection pooling is optimized

---

### Task 1.2.3: Set Up Prisma ORM and Migration Tooling
**Estimated Time**: 45 minutes
**Dependencies**: Task 1.2.2 complete

**Implementation Steps**:
1. Initialize Prisma in backend directory: `npx prisma init`
2. Update `prisma/schema.prisma` with initial configuration:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }
   
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   
   // Initial model for testing
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
     clerkId   String   @unique
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   
     @@map("users")
   }
   ```
3. Generate Prisma client: `npx prisma generate`
4. Create and run initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Create Prisma service in NestJS:
   ```typescript
   // src/prisma/prisma.service.ts
   import { Injectable, OnModuleInit } from '@nestjs/common'
   import { PrismaClient } from '@prisma/client'
   
   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit {
     async onModuleInit() {
       await this.$connect()
     }
   }
   ```
6. Create Prisma module:
   ```typescript
   // src/prisma/prisma.module.ts
   import { Module } from '@nestjs/common'
   import { PrismaService } from './prisma.service'
   
   @Module({
     providers: [PrismaService],
     exports: [PrismaService],
   })
   export class PrismaModule {}
   ```
7. Update package.json with Prisma scripts:
   ```json
   {
     "scripts": {
       "db:generate": "prisma generate",
       "db:push": "prisma db push",
       "db:migrate": "prisma migrate dev",
       "db:studio": "prisma studio"
     }
   }
   ```
8. Test Prisma connection and basic CRUD operations

**Success Criteria**:
- [x] Prisma client generates successfully
- [x] Initial migration runs without errors
- [x] Database schema is created correctly
- [x] Prisma service integrates with NestJS

---

### Task 1.2.4: Configure pgvector Extension for Embeddings
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.2.3 complete

**Implementation Steps**:
1. Enable pgvector extension in Neon database:
   - Access Neon SQL Editor
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
2. Test vector extension:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
3. Update Prisma schema to support vector types:
   ```prisma
   // Add to schema.prisma
   model Profile {
     id        String   @id @default(cuid())
     userId    String   @unique
     embedding Unsupported("vector(1536)") // OpenAI embedding dimension
     createdAt DateTime @default(now())
     updatedAt DateTime @updatedAt
   
     @@map("profiles")
   }
   ```
4. Create migration for vector support:
   ```bash
   npx prisma migrate dev --name add_vector_support
   ```
5. Create utility functions for vector operations:
   ```typescript
   // src/common/utils/vector.utils.ts
   export function cosineSimilarity(a: number[], b: number[]): number {
     const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
     const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
     const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
     return dotProduct / (magnitudeA * magnitudeB)
   }
   ```
6. Test vector operations with sample data
7. Document vector dimension standards (1536 for OpenAI)

**Success Criteria**:
- [x] pgvector extension is enabled
- [x] Vector column types work in Prisma
- [x] Vector operations can be performed
- [x] Migration completes successfully

---

### Task 1.2.5: Set Up Redis (Upstash) for Caching and Sessions
**Estimated Time**: 30 minutes
**Dependencies**: Task 1.2.1 complete

**Implementation Steps**:
1. Sign up for Upstash account at upstash.com
2. Create new Redis database named "both-sides-cache"
3. Copy connection details from Upstash dashboard
4. Install Redis client: `npm install ioredis @nestjs/redis`
5. Add Redis configuration to backend `.env`:
   ```
   REDIS_URL=rediss://default:password@host:port
   REDIS_PASSWORD=your_password
   ```
6. Create Redis module:
   ```typescript
   // src/redis/redis.module.ts
   import { Module } from '@nestjs/common'
   import { RedisModule as NestRedisModule } from '@nestjs/redis'
   
   @Module({
     imports: [
       NestRedisModule.forRoot({
         config: {
           url: process.env.REDIS_URL,
         },
       }),
     ],
   })
   export class RedisModule {}
   ```
7. Create cache service:
   ```typescript
   // src/common/services/cache.service.ts
   import { Injectable } from '@nestjs/common'
   import { InjectRedis } from '@nestjs/redis'
   import Redis from 'ioredis'
   
   @Injectable()
   export class CacheService {
     constructor(@InjectRedis() private readonly redis: Redis) {}
   
     async get(key: string): Promise<string | null> {
       return this.redis.get(key)
     }
   
     async set(key: string, value: string, ttl?: number): Promise<void> {
       if (ttl) {
         await this.redis.setex(key, ttl, value)
       } else {
         await this.redis.set(key, value)
       }
     }
   
     async del(key: string): Promise<void> {
       await this.redis.del(key)
     }
   }
   ```
8. Test Redis connection and basic operations
9. Configure Redis for session storage and caching patterns

**Success Criteria**:
- [ ] Redis connection is established
- [ ] Cache operations work correctly
- [ ] Redis service integrates with NestJS
- [ ] Connection is secure and performant

---

## Step 1.3: Authentication & Authorization
*Dependencies: Step 1.2 complete*

### Task 1.3.1: Integrate Clerk Authentication in Frontend
**Estimated Time**: 1 hour
**Dependencies**: Tasks 1.1.6 and 1.2.5 complete

**Implementation Steps**:
1. Sign up for Clerk account at clerk.com
2. Create new Clerk application named "Both Sides MVP"
3. Install Clerk SDK in frontend:
   ```bash
   cd ../  # Back to frontend directory
   npm install @clerk/nextjs
   ```
4. Add Clerk keys to frontend `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
5. Wrap app with ClerkProvider in `src/app/layout.tsx`:
   ```typescript
   import { ClerkProvider } from '@clerk/nextjs'
   
   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <ClerkProvider>
         <html lang="en">
           <body>{children}</body>
         </html>
       </ClerkProvider>
     )
   }
   ```
6. Create authentication pages:
   ```
   src/app/sign-in/[[...sign-in]]/page.tsx
   src/app/sign-up/[[...sign-up]]/page.tsx
   ```
7. Configure Clerk middleware in `middleware.ts`:
   ```typescript
   import { authMiddleware } from "@clerk/nextjs"
   
   export default authMiddleware({
     publicRoutes: ["/", "/sign-in", "/sign-up"],
   })
   
   export const config = {
     matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
   }
   ```
8. Create protected route example and test authentication flow
9. Set up user profile management components
10. Configure Clerk webhooks for user synchronization

**Success Criteria**:
- [ ] Users can sign up and sign in
- [ ] Authentication state persists across sessions
- [ ] Protected routes work correctly
- [ ] User profile data is accessible

---

### Task 1.3.2: Set Up JWT Validation in NestJS Backend
**Estimated Time**: 45 minutes
**Dependencies**: Task 1.3.1 complete

**Implementation Steps**:
1. Install JWT validation dependencies in backend:
   ```bash
   cd backend/
   npm install jwks-rsa @clerk/backend
   ```
2. Create Clerk configuration:
   ```typescript
   // src/config/clerk.config.ts
   import { registerAs } from '@nestjs/config'
   
   export default registerAs('clerk', () => ({
     secretKey: process.env.CLERK_SECRET_KEY,
     publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
   }))
   ```
3. Create JWT strategy:
   ```typescript
   // src/auth/strategies/jwt.strategy.ts
   import { Injectable, UnauthorizedException } from '@nestjs/common'
   import { PassportStrategy } from '@nestjs/passport'
   import { ExtractJwt, Strategy } from 'passport-jwt'
   import { clerkClient } from '@clerk/backend'
   
   @Injectable()
   export class JwtStrategy extends PassportStrategy(Strategy) {
     constructor() {
       super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         ignoreExpiration: false,
         secretOrKeyProvider: async (request, rawJwtToken, done) => {
           try {
             const token = await clerkClient.verifyToken(rawJwtToken)
             done(null, token.payload)
           } catch (error) {
             done(new UnauthorizedException('Invalid token'), null)
           }
         },
       })
     }
   
     async validate(payload: any) {
       return { userId: payload.sub, email: payload.email }
     }
   }
   ```
4. Create JWT Auth Guard:
   ```typescript
   // src/auth/guards/jwt-auth.guard.ts
   import { Injectable } from '@nestjs/common'
   import { AuthGuard } from '@nestjs/passport'
   
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {}
   ```
5. Create Auth module:
   ```typescript
   // src/auth/auth.module.ts
   import { Module } from '@nestjs/common'
   import { PassportModule } from '@nestjs/passport'
   import { JwtStrategy } from './strategies/jwt.strategy'
   
   @Module({
     imports: [PassportModule],
     providers: [JwtStrategy],
     exports: [JwtStrategy],
   })
   export class AuthModule {}
   ```
6. Create user decorator:
   ```typescript
   // src/common/decorators/user.decorator.ts
   import { createParamDecorator, ExecutionContext } from '@nestjs/common'
   
   export const User = createParamDecorator(
     (data: unknown, ctx: ExecutionContext) => {
       const request = ctx.switchToHttp().getRequest()
       return request.user
     },
   )
   ```
7. Test JWT validation with protected endpoint
8. Add error handling for invalid tokens

**Success Criteria**:
- [ ] JWT tokens are validated correctly
- [ ] Protected endpoints require authentication
- [ ] User information is extracted from tokens
- [ ] Error handling works for invalid tokens

---

## Phase 1 Completion Checklist

### Development Environment Ready
- [ ] Next.js frontend runs on localhost:3000
- [ ] NestJS backend runs on localhost:3001
- [ ] TypeScript compilation works without errors
- [ ] Hot reload functions in both frontend and backend

### Code Quality & Testing
- [ ] ESLint and Prettier configured and working
- [ ] Unit testing framework set up with Jest
- [ ] Code formatting is consistent
- [ ] Git repository with proper commit structure

### Database & Infrastructure
- [ ] PostgreSQL database connected (Neon)
- [ ] Prisma ORM configured with migrations
- [ ] pgvector extension enabled for embeddings
- [ ] Redis cache connected (Upstash)

### Authentication & Security
- [ ] Clerk authentication integrated in frontend
- [ ] JWT validation working in backend
- [ ] Protected routes function correctly
- [ ] User authentication flow complete

### Configuration & Documentation
- [ ] Environment variables properly configured
- [ ] All secrets managed securely
- [ ] README with setup instructions
- [ ] Development workflow documented

---

## Next Steps
Upon completion of Phase 1, you will have:
- ✅ Complete development environment setup
- ✅ Authentication system working end-to-end
- ✅ Database and caching infrastructure ready
- ✅ Code quality and testing framework in place
- ✅ Solid foundation for Phase 2 development

**Ready to proceed to Phase 2**: Core Data Models & API Foundation

---

## Estimated Total Time for Phase 1: 6-8 hours
*Time can be reduced with parallel development of frontend/backend tasks*
