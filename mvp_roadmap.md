# Both Sides MVP Roadmap & Checklist

## Overview
This roadmap breaks down the Both Sides AI-powered debate app into logical development phases, ensuring optimal dependency flow and minimal rework.

---

## Phase 1: Foundation & Core Infrastructure
*Goal: Set up the basic project structure, authentication, and database foundations*

### Step 1.1: Project Setup & Configuration
- [x] **Task 1.1.1**: Initialize Next.js project with TypeScript
- [x] **Task 1.1.2**: Configure Tailwind CSS and shadcn/ui components
- [x] **Task 1.1.3**: Set up ESLint, Prettier, and development tooling
- [x] **Task 1.1.4**: Configure environment variables and secrets management
- [x] **Task 1.1.5**: Set up Git repository and initial commit structure
- [x] **Task 1.1.6**: Set up unit testing with Jest

### Step 1.2: Database & Backend Foundation
- [x] **Task 1.2.1**: Set up NestJS backend project structure
- [ ] **Task 1.2.2**: Configure PostgreSQL database (Neon for MVP)
- [ ] **Task 1.2.3**: Set up Prisma ORM and migration tooling
- [ ] **Task 1.2.4**: Configure pgvector extension for embeddings
- [ ] **Task 1.2.5**: Set up Redis (Upstash) for caching and sessions

### Step 1.3: Authentication & Authorization
- [ ] **Task 1.3.1**: Integrate Clerk authentication in frontend
- [ ] **Task 1.3.2**: Set up JWT validation in NestJS backend


---

## Phase 2: Core Data Models & API Foundation
*Goal: Build the essential data structures and API endpoints*

### Step 2.1: Database Schema Implementation
- [ ] **Task 2.1.1**: Create `users` table with Clerk integration
- [ ] **Task 2.1.2**: Create `organizations` and `classes` tables
- [ ] **Task 2.1.3**: Create `enrollments` table for student-class relationships
- [ ] **Task 2.1.4**: Create `profiles` table for belief/ideology mapping
- [ ] **Task 2.1.5**: Run initial database migrations
- [ ] **Task 2.1.6**: Add `timeback_*` columns to relevant tables
- [ ] **Task 2.1.7**: Enable Row-Level Security and table-specific policies

### Step 2.2: User Profile System
- [ ] **Task 2.2.1**: Build user profile creation API endpoints
- [ ] **Task 2.2.2**: Create profile update and retrieval logic
- [ ] **Task 2.2.3**: Implement profile validation and data sanitization
- [ ] **Task 2.2.4**: Add audit logging for profile changes
- [ ] **Task 2.2.5**: Create profile management UI components
- [ ] **Task 2.2.6**: Create user management endpoints
- [ ] **Task 2.2.7**: Implement role-based access control (Student/Teacher)

### Step 2.3: Class & Enrollment Management
- [ ] **Task 2.3.1**: Build class creation and management APIs
- [ ] **Task 2.3.2**: Implement student enrollment system
- [ ] **Task 2.3.3**: Design RosterProvider interface and contracts
- [ ] **Task 2.3.4**: Build MockRosterProvider for demo data
- [ ] **Task 2.3.5**: Test class management workflows end-to-end

---

## Phase 3: Onboarding & Belief Mapping System
*Goal: Create the survey system that maps student beliefs and ideologies*

### Step 3.1: Survey Framework
- [ ] **Task 3.1.1**: Design survey question schema and storage
- [ ] **Task 3.1.2**: Build dynamic survey rendering system
- [ ] **Task 3.1.3**: Create survey response collection APIs
- [ ] **Task 3.1.4**: Implement survey progress tracking
- [ ] **Task 3.1.5**: Add survey validation and error handling

### Step 3.2: Belief Profile Generation
- [ ] **Task 3.2.1**: Integrate OpenAI API for text analysis
- [ ] **Task 3.2.2**: Build belief profile embedding generation
- [ ] **Task 3.2.3**: Create ideology axis mapping algorithms
- [ ] **Task 3.2.4**: Implement opinion plasticity scoring
- [ ] **Task 3.2.5**: Store and index profile embeddings in pgvector

### Step 3.3: Onboarding User Experience
- [ ] **Task 3.3.1**: Design onboarding flow UI/UX
- [ ] **Task 3.3.2**: Build progressive survey components
- [ ] **Task 3.3.3**: Create profile preview and confirmation screens
- [ ] **Task 3.3.4**: Implement onboarding completion tracking
- [ ] **Task 3.3.5**: Add skip/resume onboarding functionality

---

## Phase 4: Matching Engine & Debate Setup
*Goal: Build the AI-powered matching system and debate initialization*

### Step 4.1: Matching Algorithm
- [ ] **Task 4.1.1**: Create embedding similarity calculation functions
- [ ] **Task 4.1.2**: Build ideological difference scoring system
- [ ] **Task 4.1.3**: Implement matching constraints (class, availability)
- [ ] **Task 4.1.4**: Create match quality scoring and ranking
- [ ] **Task 4.1.5**: Build match history and cooldown logic

### Step 4.2: Match Management System
- [ ] **Task 4.2.1**: Create `matches` table and related schemas
- [ ] **Task 4.2.2**: Build match creation and assignment APIs
- [ ] **Task 4.2.3**: Implement match acceptance/rejection workflow
- [ ] **Task 4.2.4**: Create match status tracking system
- [ ] **Task 4.2.5**: Add match analytics and success metrics

### Step 4.3: Debate Topic & Position Assignment
- [ ] **Task 4.3.1**: Create debate topics database and management
- [ ] **Task 4.3.2**: Build topic selection algorithm
- [ ] **Task 4.3.3**: Implement position assignment (for/against)
- [ ] **Task 4.3.4**: Create debate preparation materials system
- [ ] **Task 4.3.5**: Build topic difficulty and complexity scoring

---

## Phase 5: Real-time Debate System
*Goal: Build the core debate experience with real-time messaging and AI moderation*

### Step 5.1: Real-time Infrastructure
- [ ] **Task 5.1.1**: Set up Ably for real-time messaging
- [ ] **Task 5.1.2**: Create WebSocket connection management
- [ ] **Task 5.1.3**: Build message routing and delivery system
- [ ] **Task 5.1.4**: Implement connection state management
- [ ] **Task 5.1.5**: Add real-time presence indicators

### Step 5.2: Conversation & Message System
- [ ] **Task 5.2.1**: Create `conversations` and `messages` tables
- [ ] **Task 5.2.2**: Build message creation and storage APIs
- [ ] **Task 5.2.3**: Implement message history and pagination
- [ ] **Task 5.2.4**: Create message formatting and rich text support
- [ ] **Task 5.2.5**: Add message status tracking (sent/delivered/read)

### Step 5.3: AI Moderation System
- [ ] **Task 5.3.1**: Build real-time message analysis pipeline
- [ ] **Task 5.3.2**: Implement toxicity and bias detection
- [ ] **Task 5.3.3**: Create moderation intervention system
- [ ] **Task 5.3.4**: Build AI coaching and prompt suggestions
- [ ] **Task 5.3.5**: Add moderation event logging and analytics

---

## Phase 6: Debate Experience & UI
*Goal: Create the complete debate user interface and experience*

### Step 6.1: Debate Room Interface
- [ ] **Task 6.1.1**: Design and build debate room layout
- [ ] **Task 6.1.2**: Create real-time message display components
- [ ] **Task 6.1.3**: Build message input and sending interface
- [ ] **Task 6.1.4**: Implement typing indicators and presence
- [ ] **Task 6.1.5**: Add debate timer and phase management

### Step 6.2: Debate Flow Management
- [ ] **Task 6.2.1**: Create debate phase system (opening, rebuttals, closing)
- [ ] **Task 6.2.2**: Build debate timer and automatic transitions
- [ ] **Task 6.2.3**: Implement turn-taking and speaking order
- [ ] **Task 6.2.4**: Create debate rules and guidelines display
- [ ] **Task 6.2.5**: Add debate pause/resume functionality

### Step 6.3: AI Assistance & Coaching
- [ ] **Task 6.3.1**: Build real-time AI coaching sidebar
- [ ] **Task 6.3.2**: Create suggestion prompts and hints system
- [ ] **Task 6.3.3**: Implement evidence and source recommendations
- [ ] **Task 6.3.4**: Add argument structure guidance
- [ ] **Task 6.3.5**: Create real-time debate quality feedback

---

## Phase 7: Reflection & Learning System
*Goal: Build post-debate reflection and learning analytics*

### Step 7.1: Reflection Framework
- [ ] **Task 7.1.1**: Create `reflections` table and schema
- [ ] **Task 7.1.2**: Build reflection prompt generation system
- [ ] **Task 7.1.3**: Create reflection response collection APIs
- [ ] **Task 7.1.4**: Implement reflection progress tracking
- [ ] **Task 7.1.5**: Add reflection completion validation

### Step 7.2: AI-Generated Summaries
- [ ] **Task 7.2.1**: Build debate transcript analysis system
- [ ] **Task 7.2.2**: Create AI-powered debate summaries
- [ ] **Task 7.2.3**: Generate personalized learning insights
- [ ] **Task 7.2.4**: Build argument strength analysis
- [ ] **Task 7.2.5**: Create improvement recommendations

### Step 7.3: Learning Analytics
- [ ] **Task 7.3.1**: Build opinion plasticity measurement system
- [ ] **Task 7.3.2**: Create learning progress tracking
- [ ] **Task 7.3.3**: Implement engagement and participation metrics
- [ ] **Task 7.3.4**: Build student learning dashboard
- [ ] **Task 7.3.5**: Create teacher analytics and insights

---

## Phase 8: Teacher Dashboard & Administration
*Goal: Build comprehensive teacher tools and administrative features*

### Step 8.1: Teacher Dashboard
- [ ] **Task 8.1.1**: Create teacher dashboard layout and navigation
- [ ] **Task 8.1.2**: Build class overview and student management
- [ ] **Task 8.1.3**: Create debate session monitoring tools
- [ ] **Task 8.1.4**: Implement student progress tracking
- [ ] **Task 8.1.5**: Add class performance analytics

### Step 8.2: Session Management
- [ ] **Task 8.2.1**: Build debate session creation and scheduling
- [ ] **Task 8.2.2**: Create session configuration options
- [ ] **Task 8.2.3**: Implement session monitoring and intervention
- [ ] **Task 8.2.4**: Add session recording and playback
- [ ] **Task 8.2.5**: Create session report generation

### Step 8.3: Administrative Tools
- [ ] **Task 8.3.1**: Build user and role management system
- [ ] **Task 8.3.2**: Create audit log viewing and filtering
- [ ] **Task 8.3.3**: Implement data export and reporting tools
- [ ] **Task 8.3.4**: Add system configuration and settings
- [ ] **Task 8.3.5**: Create backup and data retention management

---

## Phase 9: Integration Layer & TimeBack Preparation
*Goal: Build the abstraction layer for future TimeBack integration*

### Step 9.1: RosterProvider Interface
- [ ] **Task 9.1.1**: Validate and extend RosterProvider for TimeBack-specific fields and workflows
- [ ] **Task 9.1.2**: Build TimeBackRosterProvider implementation
- [ ] **Task 9.1.3**: Create roster sync and caching system
- [ ] **Task 9.1.4**: Implement error handling and fallback logic
- [ ] **Task 9.1.5**: Add integration configuration management

### Step 9.2: Data Mapping Framework
- [ ] **Task 9.2.1**: Build external ID mapping system
- [ ] **Task 9.2.2**: Create data synchronization framework
- [ ] **Task 9.2.3**: Implement conflict resolution logic
- [ ] **Task 9.2.4**: Add integration status monitoring

### Step 9.3: API Abstraction Layer
- [ ] **Task 9.3.1**: Create external API client framework
- [ ] **Task 9.3.2**: Build API rate limiting and retry logic
- [ ] **Task 9.3.3**: Implement API health monitoring
- [ ] **Task 9.3.4**: Create API response caching system
- [ ] **Task 9.3.5**: Add API error handling and logging

---

## Phase 10: Testing, Security & Deployment
*Goal: Ensure production readiness with comprehensive testing and security*

### Step 10.1: Testing Framework
- [ ] **Task 10.1.1**: Expand unit test suite and coverage thresholds
- [ ] **Task 10.1.2**: Create integration tests for APIs
- [ ] **Task 10.1.3**: Build end-to-end tests with Playwright
- [ ] **Task 10.1.4**: Implement load testing for real-time features
- [ ] **Task 10.1.5**: Create automated test CI/CD pipeline

### Step 10.2: Security & Compliance
- [ ] **Task 10.2.1**: Conduct security audit and penetration testing
- [ ] **Task 10.2.2**: Implement FERPA compliance measures
- [ ] **Task 10.2.3**: Add data encryption and key management
- [ ] **Task 10.2.4**: Create privacy policy and terms of service
- [ ] **Task 10.2.5**: Implement audit logging and monitoring

### Step 10.3: Production Deployment
- [ ] **Task 10.3.1**: Set up production infrastructure (Vercel + Railway)
- [ ] **Task 10.3.2**: Configure production databases and caching
- [ ] **Task 10.3.3**: Set up monitoring and alerting systems
- [ ] **Task 10.3.4**: Create deployment automation and CI/CD
- [ ] **Task 10.3.5**: Conduct production readiness review

---

## Phase 11: MVP Launch & Iteration
*Goal: Launch MVP and gather feedback for improvements*

### Step 11.1: Pilot Preparation
- [ ] **Task 11.1.1**: Create demo data and test scenarios
- [ ] **Task 11.1.2**: Build user onboarding and tutorial system
- [ ] **Task 11.1.3**: Create documentation and user guides
- [ ] **Task 11.1.4**: Set up feedback collection system
- [ ] **Task 11.1.5**: Prepare launch communication materials

### Step 11.2: MVP Launch
- [ ] **Task 11.2.1**: Deploy MVP to production environment
- [ ] **Task 11.2.2**: Conduct initial user testing and feedback
- [ ] **Task 11.2.3**: Monitor system performance and stability
- [ ] **Task 11.2.4**: Address critical bugs and issues
- [ ] **Task 11.2.5**: Gather user feedback and usage analytics

### Step 11.3: Post-Launch Iteration
- [ ] **Task 11.3.1**: Analyze user feedback and usage patterns
- [ ] **Task 11.3.2**: Prioritize feature improvements and bug fixes
- [ ] **Task 11.3.3**: Plan TimeBack integration implementation
- [ ] **Task 11.3.4**: Prepare for school pilot program
- [ ] **Task 11.3.5**: Create roadmap for post-MVP features

---

## Dependencies & Critical Path Notes

### Key Dependencies:
1. **Authentication must be completed** before any user-specific features
2. **Database schema must be stable** before building APIs
3. **Profile system must work** before matching can be implemented
4. **Real-time infrastructure must be solid** before debate features
5. **Core debate system must be functional** before reflection features
6. **MockRosterProvider must be complete** before TimeBack abstraction

### Parallel Development Opportunities:
- UI components can be built alongside API development
- Testing can be written in parallel with feature development
- Documentation can be created as features are completed
- Integration layer can be built while core features are stabilized

### Risk Mitigation:
- Each phase has clear deliverables and success criteria
- Dependencies are explicitly mapped to prevent blocking
- Integration points are abstracted to allow independent development
- Testing is integrated throughout rather than left to the end

This roadmap ensures a logical flow from foundation to launch while maintaining flexibility for iteration and improvement.
