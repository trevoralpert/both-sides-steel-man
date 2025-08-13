-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "clerkId" TEXT NOT NULL,
    "grade" TEXT,
    "school" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "timebackUserId" TEXT,
    "timebackSyncedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "politicalBeliefs" JSONB,
    "moralFoundations" JSONB,
    "personalityTraits" JSONB,
    "learningPreferences" JSONB,
    "profileVisibility" TEXT NOT NULL DEFAULT 'private',
    "allowMatching" BOOLEAN NOT NULL DEFAULT true,
    "debatesParticipated" INTEGER NOT NULL DEFAULT 0,
    "opinionsChanged" INTEGER NOT NULL DEFAULT 0,
    "empathyScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxStudents" INTEGER,
    "timebackClassId" TEXT,
    "timebackRosterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."class_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'student',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "topic" TEXT NOT NULL,
    "classId" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "maxParticipants" INTEGER,
    "timeLimit" INTEGER,
    "aiModerationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moderationPrompt" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "debates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_participations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "side" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "messagesCount" INTEGER NOT NULL DEFAULT 0,
    "empathyScore" DOUBLE PRECISION,
    "persuasivenessScore" DOUBLE PRECISION,

    CONSTRAINT "debate_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."debate_messages" (
    "id" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'text',
    "sentimentScore" DOUBLE PRECISION,
    "empathyScore" DOUBLE PRECISION,
    "toxicityScore" DOUBLE PRECISION,
    "aiModerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModerationNote" TEXT,
    "parentMessageId" TEXT,
    "threadDepth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debate_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reflections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "debateId" TEXT NOT NULL,
    "initialPosition" TEXT,
    "finalPosition" TEXT,
    "positionChanged" BOOLEAN NOT NULL DEFAULT false,
    "keyInsights" TEXT,
    "empathyGained" TEXT,
    "experienceRating" INTEGER,
    "learningRating" INTEGER,
    "empathyRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."embeddings" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-ada-002',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "public"."users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "public"."user_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "public"."classes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "class_enrollments_userId_classId_key" ON "public"."class_enrollments"("userId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "debate_participations_userId_debateId_key" ON "public"."debate_participations"("userId", "debateId");

-- CreateIndex
CREATE UNIQUE INDEX "reflections_userId_debateId_key" ON "public"."reflections"("userId", "debateId");

-- CreateIndex
CREATE UNIQUE INDEX "embeddings_entityType_entityId_key" ON "public"."embeddings"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "public"."user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."class_enrollments" ADD CONSTRAINT "class_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debates" ADD CONSTRAINT "debates_classId_fkey" FOREIGN KEY ("classId") REFERENCES "public"."classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_participations" ADD CONSTRAINT "debate_participations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_participations" ADD CONSTRAINT "debate_participations_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "public"."debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."debate_messages" ADD CONSTRAINT "debate_messages_debateId_fkey" FOREIGN KEY ("debateId") REFERENCES "public"."debates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reflections" ADD CONSTRAINT "reflections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
